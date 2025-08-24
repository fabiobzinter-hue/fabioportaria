import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Camera, X, RotateCcw, AlertCircle } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File, preview: string) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // Configurações da webcam
  const videoConstraints = {
    width: { ideal: 1280, min: 640 },
    height: { ideal: 720, min: 480 },
    facingMode: facingMode
  };

  const handleUserMedia = useCallback(() => {
    console.log('📸 Câmera iniciada com sucesso');
    setIsReady(true);
    setIsLoading(false);
    setError(null);
  }, []);

  const handleUserMediaError = useCallback((error: string | DOMException) => {
    console.error('❌ Erro na câmera:', error);
    setIsLoading(false);
    setIsReady(false);
    
    let errorMessage = 'Erro ao acessar câmera';
    
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = 'Permissão de câmera negada. Permita o acesso à câmera nas configurações do navegador.';
          break;
        case 'NotFoundError':
          errorMessage = 'Câmera não encontrada. Verifique se o dispositivo possui câmera.';
          break;
        case 'NotSupportedError':
          errorMessage = 'Câmera não suportada neste dispositivo ou navegador.';
          break;
        case 'NotReadableError':
          errorMessage = 'Câmera está sendo usada por outro aplicativo. Feche outros apps que usam a câmera.';
          break;
        case 'OverconstrainedError':
          errorMessage = 'Configuração de câmera não suportada neste dispositivo.';
          break;
        default:
          errorMessage = `Erro: ${error.message || 'Falha desconhecida'}`;
      }
    }
    
    setError(errorMessage);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!webcamRef.current || !isReady) {
      console.error('❌ Webcam não está pronta');
      setError('Câmera ainda não está pronta. Aguarde um momento.');
      return;
    }

    try {
      console.log('📸 Capturando foto...');
      
      // Capturar screenshot da webcam
      const imageSrc = webcamRef.current.getScreenshot();
      
      if (!imageSrc) {
        console.error('❌ Falha ao capturar imagem');
        setError('Falha ao capturar imagem. Tente novamente.');
        return;
      }

      // Converter dataURL para blob e depois para File
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `foto-${Date.now()}.jpg`, { 
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          
          console.log('✅ Foto capturada com sucesso');
          console.log('Tamanho do arquivo:', Math.round(blob.size / 1024), 'KB');
          
          onCapture(file, imageSrc);
        })
        .catch(error => {
          console.error('❌ Erro ao processar imagem:', error);
          setError('Erro ao processar imagem');
        });
        
    } catch (error) {
      console.error('❌ Erro ao capturar foto:', error);
      setError('Erro inesperado ao capturar foto');
    }
  }, [isReady, onCapture]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setIsLoading(true);
    setIsReady(false);
  }, []);

  const retryCamera = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setIsReady(false);
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button
          onClick={onClose}
          variant="destructive"
          size="sm"
          className="rounded-full w-12 h-12 p-0"
        >
          <X className="h-6 w-6" />
        </Button>
        
        {isReady && (
          <Button
            onClick={switchCamera}
            variant="secondary"
            size="sm"
            className="rounded-full w-12 h-12 p-0"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.85}
          videoConstraints={videoConstraints}
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
          className="w-full h-full object-cover"
          mirrored={facingMode === 'user'}
        />
      </div>
      
      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <div className="text-xl">Carregando câmera...</div>
            <div className="text-sm mt-2">Aguarde a inicialização</div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
          <div className="text-white text-center max-w-sm mx-4">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <div className="text-xl mb-4">Erro na Câmera</div>
            <div className="text-sm mb-6">{error}</div>
            <div className="space-y-2">
              <Button onClick={retryCamera} className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
              <Button onClick={switchCamera} variant="outline" className="w-full">
                Trocar Câmera
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
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-6 z-10">
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
            className="bg-white text-black rounded-full w-20 h-20 p-0 border-4 border-white hover:bg-gray-100 disabled:opacity-50"
          >
            <Camera className="h-10 w-10" />
          </Button>
        </div>
      )}
    </div>
  );
};
