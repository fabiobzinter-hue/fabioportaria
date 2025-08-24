import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, RotateCcw, AlertCircle } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File, preview: string) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
  };

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Parar qualquer stream anterior
      stopCamera();

      console.log('📸 Iniciando câmera...');
      
      // Verificar se getUserMedia está disponível
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia não suportado neste navegador');
      }

      // Diferentes configurações para tentar
      const constraints = [
        {
          video: {
            facingMode: { ideal: 'environment' }, // Câmera traseira preferencial
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        },
        {
          video: {
            facingMode: 'environment' // Câmera traseira
          }
        },
        {
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        },
        {
          video: true // Configuração mais básica
        }
      ];

      let mediaStream = null;
      let lastError = null;

      // Tentar cada configuração até uma funcionar
      for (let i = 0; i < constraints.length; i++) {
        try {
          console.log(`➡️ Tentando configuração ${i + 1}/${constraints.length}...`);
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints[i]);
          console.log(`✅ Configuração ${i + 1} bem-sucedida`);
          break;
        } catch (error) {
          console.error(`❌ Configuração ${i + 1} falhou:`, error);
          lastError = error;
          if (i === constraints.length - 1) {
            throw lastError;
          }
        }
      }

      if (!mediaStream) {
        throw lastError || new Error('Não foi possível acessar a câmera');
      }
      
      console.log('✅ Câmera acessada com sucesso');
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Aguardar o vídeo carregar completamente
        const waitForVideo = () => {
          return new Promise((resolve, reject) => {
            const video = videoRef.current;
            if (!video) {
              reject(new Error('Elemento de vídeo não encontrado'));
              return;
            }

            const onLoadedMetadata = () => {
              console.log('🎥 Metadados do vídeo carregados');
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              resolve(true);
            };

            const onError = (e: Event) => {
              console.error('❌ Erro no carregamento do vídeo:', e);
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              reject(new Error('Erro no carregamento do vídeo'));
            };

            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('error', onError);

            // Timeout de 15 segundos (mais tempo para dispositivos lentos)
            setTimeout(() => {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              reject(new Error('Timeout ao carregar vídeo'));
            }, 15000);
          });
        };

        try {
          console.log('➡️ Aguardando metadados do vídeo...');
          await waitForVideo();
          
          // Tentar reproduzir o vídeo com retry
          const playVideo = async (retries = 3) => {
            for (let i = 0; i < retries; i++) {
              try {
                console.log(`➡️ Tentativa ${i + 1} de reproduzir vídeo...`);
                await videoRef.current!.play();
                console.log('🎥 Vídeo iniciado com sucesso');
                return;
              } catch (playError) {
                console.error(`❌ Tentativa ${i + 1} falhou:`, playError);
                if (i === retries - 1) throw playError;
                await new Promise(resolve => setTimeout(resolve, 500)); // Aguardar 500ms
              }
            }
          };

          await playVideo();
          setIsReady(true);
          setIsLoading(false);
        } catch (playError) {
          console.error('❌ Erro ao reproduzir vídeo:', playError);
          setError('Erro ao reproduzir vídeo. Verifique se a câmera não está sendo usada por outro aplicativo.');
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('❌ Erro fatal ao iniciar câmera:', error);
      
      let errorMessage = 'Erro ao acessar câmera';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Permissão de câmera negada. Permita o acesso à câmera nas configurações do navegador.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Câmera não encontrada. Verifique se o dispositivo possui câmera.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Câmera não suportada neste dispositivo ou navegador.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Câmera está sendo usada por outro aplicativo. Feche outros apps que usam a câmera.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'Configuração de câmera não suportada neste dispositivo.';
        } else {
          errorMessage = `Erro: ${error.message}`;
        }
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('❌ Elementos de vídeo ou canvas não encontrados');
      setError('Erro nos elementos de captura');
      return;
    }

    if (!isReady) {
      console.error('❌ Câmera não está pronta');
      setError('Câmera ainda não está pronta. Aguarde um momento.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Verificar se o vídeo tem dados suficientes
    if (video.readyState < 2) {
      console.error('❌ Vídeo não tem dados suficientes:', video.readyState);
      setError('Vídeo ainda carregando. Aguarde um momento.');
      return;
    }

    // Verificar dimensões do vídeo
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('❌ Dimensões de vídeo inválidas:', video.videoWidth, 'x', video.videoHeight);
      setError('Erro nas dimensões do vídeo. Tente novamente.');
      return;
    }

    try {
      console.log('📸 Capturando foto...');
      console.log('Dimensões do vídeo:', video.videoWidth, 'x', video.videoHeight);
      
      // Definir dimensões do canvas baseadas no vídeo
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('❌ Não foi possível obter contexto 2D do canvas');
        setError('Erro ao processar imagem');
        return;
      }

      // Desenhar o frame atual do vídeo no canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Converter para diferentes formatos
      try {
        // Primeira tentativa: blob com qualidade alta
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const preview = canvas.toDataURL('image/jpeg', 0.85);
            
            console.log('✅ Foto capturada com sucesso');
            console.log('Tamanho do arquivo:', Math.round(blob.size / 1024), 'KB');
            onCapture(file, preview);
          } else {
            console.error('❌ Erro ao criar blob da foto');
            // Fallback: tentar dataURL diretamente
            try {
              const dataURL = canvas.toDataURL('image/jpeg', 0.85);
              // Converter dataURL para blob
              fetch(dataURL)
                .then(res => res.blob())
                .then(blob => {
                  const file = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
                  console.log('✅ Foto capturada via fallback');
                  onCapture(file, dataURL);
                })
                .catch(() => {
                  setError('Erro ao processar imagem');
                });
            } catch (dataURLError) {
              console.error('❌ Erro no fallback dataURL:', dataURLError);
              setError('Erro ao processar foto');
            }
          }
        }, 'image/jpeg', 0.85);
      } catch (blobError) {
        console.error('❌ Erro ao criar blob:', blobError);
        setError('Erro ao salvar foto');
      }
    } catch (error) {
      console.error('❌ Erro ao capturar foto:', error);
      setError('Erro inesperado ao capturar foto');
    }
  };

  const retryCamera = () => {
    setError(null);
    startCamera();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          onClick={onClose}
          variant="destructive"
          size="sm"
          className="rounded-full w-12 h-12 p-0"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Vídeo */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="flex-1 w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <div className="text-xl">Carregando câmera...</div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-white text-center max-w-sm mx-4">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <div className="text-xl mb-4">Erro na Câmera</div>
            <div className="text-sm mb-6">{error}</div>
            <div className="space-y-2">
              <Button onClick={retryCamera} className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
              <Button onClick={onClose} variant="outline" className="w-full">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Controls */}
      {isReady && !error && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-6">
          <Button
            onClick={onClose}
            variant="destructive"
            size="lg"
            className="rounded-full w-16 h-16 p-0"
          >
            <X className="h-8 w-8" />
          </Button>
          
          <Button
            onClick={capturePhoto}
            disabled={!isReady}
            variant="default"
            size="lg"
            className="bg-white text-black rounded-full w-20 h-20 p-0 border-4 border-white hover:bg-gray-100"
          >
            <Camera className="h-10 w-10" />
          </Button>
        </div>
      )}
    </div>
  );
};
