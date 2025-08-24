import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Image, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CameraCaptureProps {
  onCapture: (file: File, preview: string) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Função para abrir câmera
  const openCamera = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  // Função para abrir galeria
  const openGallery = () => {
    if (galleryInputRef.current) {
      galleryInputRef.current.click();
    }
  };

  // Processar arquivo selecionado
  const processFile = (file: File) => {
    setIsLoading(true);
    
    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas arquivos de imagem."
      });
      setIsLoading(false);
      return;
    }

    // Verificar tamanho do arquivo (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "Por favor, selecione uma imagem menor que 5MB."
      });
      setIsLoading(false);
      return;
    }

    // Criar preview da imagem
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (preview) {
        console.log('✅ Foto processada com sucesso');
        console.log('Tamanho:', Math.round(file.size / 1024), 'KB');
        
        toast({
          title: "Foto capturada!",
          description: "Foto salva com sucesso."
        });
        
        onCapture(file, preview);
      }
      setIsLoading(false);
    };
    
    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "Erro ao processar imagem",
        description: "Não foi possível processar a imagem selecionada."
      });
      setIsLoading(false);
    };
    
    reader.readAsDataURL(file);
  };

  // Handler para input file com câmera
  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  // Handler para input file da galeria
  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6">
      {/* Botão fechar */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          onClick={onClose}
          variant="destructive"
          size="sm"
          className="rounded-full w-10 h-10 p-0"
          disabled={isLoading}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Conteúdo principal */}
      <div className="text-center text-white max-w-sm w-full">
        <div className="mb-8">
          <Camera className="h-16 w-16 mx-auto mb-4 text-blue-400" />
          <h2 className="text-xl font-bold mb-2">Adicionar Foto</h2>
          <p className="text-gray-300 text-sm">Escolha como deseja adicionar a foto da encomenda</p>
        </div>

        {/* Botões de ação */}
        <div className="space-y-4">
          {/* Botão Câmera */}
          <Button
            onClick={openCamera}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-medium"
            size="lg"
          >
            <Camera className="h-6 w-6 mr-3" />
            {isLoading ? 'Processando...' : 'Tirar Foto'}
          </Button>

          {/* Botão Galeria */}
          <Button
            onClick={openGallery}
            disabled={isLoading}
            variant="outline"
            className="w-full border-white/30 text-white hover:bg-white/10 py-6 text-lg font-medium"
            size="lg"
          >
            <Image className="h-6 w-6 mr-3" />
            Escolher da Galeria
          </Button>

          {/* Botão Cancelar */}
          <Button
            onClick={onClose}
            disabled={isLoading}
            variant="ghost"
            className="w-full text-gray-300 hover:text-white hover:bg-white/10 py-4 text-base"
            size="lg"
          >
            Cancelar
          </Button>
        </div>
      </div>

      {/* Inputs file ocultos */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraChange}
        className="hidden"
      />
      
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryChange}
        className="hidden"
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <div className="text-lg font-medium">Processando foto...</div>
            <div className="text-sm text-gray-300 mt-1">Aguarde um momento</div>
          </div>
        </div>
      )}
    </div>
  );
};
