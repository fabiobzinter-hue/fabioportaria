import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Image, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CameraCaptureProps {
  onCapture: (file: File, preview: string) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Função para capturar foto via input file (mais confiável)
  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Função para escolher da galeria
  const handleGallerySelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        processFile(file);
      }
    };
    
    input.click();
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

    // Verificar tamanho do arquivo (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "Por favor, selecione uma imagem menor que 10MB."
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
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
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

      {/* Conteúdo principal */}
      <div className="text-center text-white max-w-md">
        <div className="mb-8">
          <Camera className="h-20 w-20 mx-auto mb-4 text-blue-400" />
          <h2 className="text-2xl font-bold mb-2">Adicionar Foto</h2>
          <p className="text-gray-300">Escolha como deseja adicionar a foto da encomenda</p>
        </div>

        {/* Botões de ação */}
        <div className="space-y-4">
          {/* Botão Câmera */}
          <Button
            onClick={handleCameraCapture}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg"
            size="lg"
          >
            <Camera className="h-6 w-6 mr-3" />
            {isLoading ? 'Processando...' : 'Tirar Foto'}
          </Button>

          {/* Botão Galeria */}
          <Button
            onClick={handleGallerySelect}
            disabled={isLoading}
            variant="outline"
            className="w-full border-gray-300 text-gray-700 py-4 text-lg bg-white hover:bg-gray-50"
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
            className="w-full text-gray-300 hover:text-white py-4 text-lg"
            size="lg"
          >
            Cancelar
          </Button>
        </div>

        {/* Input file oculto para câmera */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <div className="text-xl">Processando foto...</div>
          </div>
        </div>
      )}
    </div>
  );
};
