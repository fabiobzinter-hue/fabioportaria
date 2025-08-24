import React, { useState } from 'react';
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

  const [codigoRetirada, setCodigoRetirada] = useState('');

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
      // 1. SALVAR NO SUPABASE PRIMEIRO (para gerar código automático)
      const now = new Date();
      const data = now.toLocaleDateString('pt-BR');
      const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      const { data: entregaData, error: saveError } = await supabase
        .from('entregas')
        .insert({
          morador_id: selectedMorador.id,
          data_entrega: now.toISOString(),
          status: 'pendente',
          observacoes: observacoes || null,
          foto_url: photoPreview // Base64 da foto
        })
        .select('id, codigo_retirada')
        .single();

      if (saveError) {
        console.error('❌ Erro ao salvar no Supabase:', saveError);
        throw new Error('Falha ao salvar no banco de dados');
      }

      const codigoGerado = entregaData.codigo_retirada;
      setCodigoRetirada(codigoGerado);

      // 2. SALVAR NO LOCALSTORAGE (para compatibilidade)
      const delivery = {
        id: entregaData.id.toString(),
        resident: {
          id: selectedMorador.id,
          name: selectedMorador.nome,
          phone: selectedMorador.telefone,
        },
        apartmentInfo: {
          bloco: selectedMorador.bloco,
          apartamento: selectedMorador.apartamento,
        },
        withdrawalCode: codigoGerado,
        photo: photoPreview,
        observations: observacoes,
        timestamp: now.toISOString(),
        status: 'pendente'
      };

      const deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
      deliveries.push(delivery);
      localStorage.setItem('deliveries', JSON.stringify(deliveries));

      // 3. ENVIAR WHATSAPP COM FORMATO BONITO (igual ao screenshot)
      try {
        const mensagemFormatada = `🏢 *Condomínio Arco Iris*\n\n📦 *Nova Encomenda Chegou!*\n\nOlá *${selectedMorador.nome}*, você tem uma nova encomenda!\n\n📅 Data: ${data}\n⏰ Hora: ${hora}\n🔑 Código de retirada: *${codigoGerado}*\n\nPara retirar, apresente este código na portaria.\n\nNão responda esta mensagem, este é um atendimento automático.`;
        
        await fetch('https://ofaifvyowixzktwvxrps.supabase.co/functions/v1/send-whatsapp-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedMorador.telefone,
            message: mensagemFormatada,
            type: 'delivery',
            deliveryData: {
              codigo: codigoGerado,
              morador: selectedMorador.nome,
              apartamento: selectedMorador.apartamento,
              bloco: selectedMorador.bloco,
              observacoes: observacoes,
              foto_data_url: photoPreview
            }
          })
        });
        
        console.log('✅ WhatsApp enviado com sucesso');
      } catch (error) {
        console.error('❌ Erro ao enviar WhatsApp:', error);
      }

      toast({
        title: "✅ Encomenda registrada!",
        description: `Código gerado: ${codigoGerado} | WhatsApp enviado!`,
      });

      onBack();
    } catch (error: any) {
      console.error('❌ Erro geral:', error);
      toast({
        variant: "destructive",
        title: "❌ Erro",
        description: error.message || "Falha ao registrar encomenda.",
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

          {/* Foto - Implementação ULTRA SIMPLES */}
          <div>
            <Label>📷 Foto da Encomenda *</Label>
            <p className="text-sm text-muted-foreground mb-3">
              💡 Escolha uma opção para adicionar a foto:
            </p>
            
            {!photoPreview ? (
              <div className="space-y-3">
                {/* DIRECT INPUT BUTTONS - Muito mais simples */}
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraInput}
                    className="hidden"
                  />
                  <div className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors">
                    <Camera className="h-6 w-6 mr-2" />
                    <span className="font-medium">
                      {isProcessingPhoto ? 'Processando...' : '📷 TIRAR FOTO'}
                    </span>
                  </div>
                </label>
                
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleGalleryInput}
                    className="hidden"
                  />
                  <div className="w-full h-16 border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg flex items-center justify-center cursor-pointer transition-colors">
                    <Image className="h-6 w-6 mr-2 text-gray-600" />
                    <span className="font-medium text-gray-700">
                      {isProcessingPhoto ? 'Processando...' : '🖼️ GALERIA'}
                    </span>
                  </div>
                </label>
                
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700 text-center">
                    ✨ <strong>📷 TIRAR FOTO:</strong> Abre câmera do celular<br/>
                    🖼️ <strong>GALERIA:</strong> Escolhe foto existente
                  </p>
                </div>
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
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleCameraInput}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={isProcessingPhoto}
                      asChild
                    >
                      <div>
                        <Camera className="h-4 w-4 mr-2" />
                        Nova Foto
                      </div>
                    </Button>
                  </label>
                  
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleGalleryInput}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={isProcessingPhoto}
                      asChild
                    >
                      <div>
                        <Image className="h-4 w-4 mr-2" />
                        Trocar
                      </div>
                    </Button>
                  </label>
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
    </div>
  );
};
