import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Camera, Package, Send, X, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Morador {
  id: string;
  nome: string;
  apartamento: string;
  bloco: string;
  telefone: string;
}

interface SimpleDeliveryFormProps {
  onBack: () => void;
  moradores: Morador[];
}

export const SimpleDeliveryForm = ({ onBack, moradores }: SimpleDeliveryFormProps) => {
  const [apartamento, setApartamento] = useState('');
  const [selectedMorador, setSelectedMorador] = useState<Morador | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const { toast } = useToast();
  
  // Refs para os inputs de arquivo
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const codigoRetirada = Math.floor(10000 + Math.random() * 90000).toString();

  const buscarMoradores = () => {
    if (!apartamento.trim()) return;
    
    const encontrados = moradores.filter(m => 
      m.apartamento === apartamento.trim()
    );
    
    if (encontrados.length > 0) {
      setSelectedMorador(encontrados[0]);
    } else {
      toast({
        variant: "destructive",
        title: "Apartamento não encontrado",
        description: "Verifique o número do apartamento.",
      });
    }
  };

  // Função para processar arquivo selecionado
  const processFile = (file: File) => {
    setIsProcessingPhoto(true);
    
    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas arquivos de imagem."
      });
      setIsProcessingPhoto(false);
      return;
    }

    // Verificar tamanho do arquivo (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "Por favor, selecione uma imagem menor que 5MB."
      });
      setIsProcessingPhoto(false);
      return;
    }

    // Criar preview da imagem
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (preview) {
        setPhotoFile(file);
        setPhotoPreview(preview);
        
        toast({
          title: "Foto processada!",
          description: "Foto salva com sucesso."
        });
      }
      setIsProcessingPhoto(false);
    };
    
    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "Erro ao processar imagem",
        description: "Não foi possível processar a imagem selecionada."
      });
      setIsProcessingPhoto(false);
    };
    
    reader.readAsDataURL(file);
  };

  // Handler para input de câmera
  const handleCameraInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  // Handler para input de galeria
  const handleGalleryInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

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

  const handleSubmit = async () => {
    if (!selectedMorador || !photoFile) {
      toast({
        variant: "destructive",
        title: "Dados incompletos",
        description: "Selecione um morador e tire uma foto.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Salvar no localStorage no formato unificado "deliveries"
      const delivery = {
        id: Date.now().toString(),
        resident: {
          id: selectedMorador.id,
          name: selectedMorador.nome,
          phone: selectedMorador.telefone,
        },
        apartmentInfo: {
          bloco: selectedMorador.bloco,
          apartamento: selectedMorador.apartamento,
        },
        withdrawalCode: codigoRetirada,
        photo: photoPreview,
        observations: observacoes,
        timestamp: new Date().toISOString(),
        status: 'pendente'
      };

      const deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
      deliveries.push(delivery);
      localStorage.setItem('deliveries', JSON.stringify(deliveries));

      // Enviar WhatsApp
      try {
        await fetch('https://ofaifvyowixzktwvxrps.supabase.co/functions/v1/send-whatsapp-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedMorador.telefone,
            message: `📦 Nova encomenda chegou!\n\nOlá ${selectedMorador.nome}, você tem uma encomenda!\n\nCódigo: ${codigoRetirada}\nApartamento: ${selectedMorador.apartamento}\n\nApresente este código na portaria para retirar.`
          })
        });
      } catch (error) {
        console.error('Erro WhatsApp:', error);
      }

      toast({
        title: "Encomenda registrada!",
        description: `Código: ${codigoRetirada}`,
      });

      onBack();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao registrar encomenda.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Button onClick={onBack} variant="ghost">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Nova Encomenda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Buscar Apartamento */}
          <div>
            <Label>Apartamento</Label>
            <div className="flex gap-2">
              <Input
                value={apartamento}
                onChange={(e) => setApartamento(e.target.value)}
                placeholder="Ex: 1905"
                className="text-lg"
              />
              <Button onClick={buscarMoradores}>Buscar</Button>
            </div>
          </div>

          {/* Morador Selecionado */}
          {selectedMorador && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <h3 className="font-bold">{selectedMorador.nome}</h3>
                <p>Apartamento: {selectedMorador.apartamento}</p>
                <p>Telefone: {selectedMorador.telefone}</p>
                <p className="text-lg font-bold text-blue-600">Código: {codigoRetirada}</p>
              </CardContent>
            </Card>
          )}

          {/* Observações */}
          <div>
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações sobre a encomenda..."
            />
          </div>

          {/* Foto - Nova implementação simples */}
          <div>
            <Label>📷 Foto da Encomenda *</Label>
            <p className="text-sm text-muted-foreground mb-3">
              💡 Escolha como adicionar a foto da encomenda:
            </p>
            
            {!photoPreview ? (
              <div className="space-y-3">
                {/* Botão Câmera */}
                <Button
                  onClick={openCamera}
                  disabled={isProcessingPhoto}
                  variant="default"
                  className="w-full h-16 text-white bg-blue-600 hover:bg-blue-700"
                >
                  <div className="text-center">
                    <Camera className="h-6 w-6 mx-auto mb-1" />
                    <div className="text-sm font-medium">
                      {isProcessingPhoto ? 'Processando...' : '📷 Tirar Foto'}
                    </div>
                  </div>
                </Button>
                
                {/* Botão Galeria */}
                <Button
                  onClick={openGallery}
                  disabled={isProcessingPhoto}
                  variant="outline"
                  className="w-full h-16 border-2 border-dashed border-gray-300 hover:border-gray-400"
                >
                  <div className="text-center">
                    <Image className="h-6 w-6 mx-auto mb-1 text-gray-600" />
                    <div className="text-sm font-medium text-gray-700">
                      {isProcessingPhoto ? 'Processando...' : '🖼️ Escolher da Galeria'}
                    </div>
                  </div>
                </Button>
                
                <p className="text-xs text-center text-gray-500">
                  ⚡ Dica: Use "Tirar Foto" para câmera rápida ou "Galeria" para fotos existentes
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview da encomenda"
                    className="w-full h-48 object-cover rounded-lg border-2 border-green-200"
                  />
                  <Button
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview('');
                      toast({
                        title: "Foto removida",
                        description: "Você pode adicionar uma nova foto.",
                      });
                    }}
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 rounded-full w-8 h-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={openCamera}
                    disabled={isProcessingPhoto}
                    variant="outline"
                    className="w-full"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Nova Foto
                  </Button>
                  <Button
                    onClick={openGallery}
                    disabled={isProcessingPhoto}
                    variant="outline"
                    className="w-full"
                  >
                    <Image className="h-4 w-4 mr-2" />
                    Trocar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedMorador || !photoFile || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>Salvando...</>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Registrar Encomenda
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      {/* Inputs file ocultos */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraInput}
        className="hidden"
      />
      
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryInput}
        className="hidden"
      />
    </div>
  );
};
