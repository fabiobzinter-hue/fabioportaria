import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Package, 
  CheckCircle, 
  Search,
  Clock,
  AlertCircle,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface WithdrawalPanelProps {
  onBack: () => void;
  onChange?: () => void;
  condominioNome?: string;
}

interface Delivery {
  id: string;
  resident: {
    id: string;
    name: string;
    phone: string;
    role?: string;
  };
  apartmentInfo: {
    bloco: string;
    apartamento: string;
  };
  withdrawalCode: string;
  photo: string;
  observations: string;
  timestamp: string;
  status: string;
}

export const WithdrawalPanel = ({ onBack, onChange, condominioNome }: WithdrawalPanelProps) => {
  const [withdrawalCode, setWithdrawalCode] = useState("");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [foundDelivery, setFoundDelivery] = useState<Delivery | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [withdrawalDescription, setWithdrawalDescription] = useState("");
  const { toast } = useToast();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const loadPendingDeliveries = async () => {
    try {
      // Carregar do Supabase
      console.log('📦 Carregando entregas pendentes do Supabase...');
      
      const { data: entregas, error } = await supabase
        .from('entregas')
        .select(`
          *,
          moradores (
            id,
            nome,
            telefone,
            apartamento,
            bloco
          )
        `)
        .eq('status', 'pendente')
        .order('data_entrega', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar do Supabase:', error);
      } else {
        console.log('✅ Entregas carregadas do Supabase:', entregas?.length || 0);
      }

      // Converter entregas do Supabase para o formato Delivery
      const supabaseDeliveries: Delivery[] = (entregas || []).map(entrega => ({
        id: entrega.id,
        resident: {
          id: entrega.moradores.id,
          name: entrega.moradores.nome,
          phone: entrega.moradores.telefone,
        },
        apartmentInfo: {
          bloco: entrega.moradores.bloco || '',
          apartamento: entrega.moradores.apartamento,
        },
        withdrawalCode: entrega.codigo_retirada,
        photo: entrega.foto_url || '',
        observations: entrega.observacoes || '',
        timestamp: entrega.data_entrega,
        status: entrega.status
      }));

      // Carregar do localStorage também
      const savedDeliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
      const localDeliveries = savedDeliveries.filter((d: Delivery) => d.status === 'pendente');

      // Combinar e remover duplicatas (priorizar Supabase)
      const allDeliveries = [...supabaseDeliveries];
      
      // Adicionar entregas do localStorage que não estão no Supabase
      localDeliveries.forEach((localDelivery: Delivery) => {
        const exists = allDeliveries.some(d => d.withdrawalCode === localDelivery.withdrawalCode);
        if (!exists) {
          allDeliveries.push(localDelivery);
        }
      });

      console.log('📊 Total de entregas pendentes:', allDeliveries.length);
      setDeliveries(allDeliveries);
      
    } catch (error) {
      console.error('❌ Erro ao carregar entregas:', error);
      
      // Fallback para localStorage apenas
      const savedDeliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
      const pending = savedDeliveries.filter((d: Delivery) => d.status === 'pendente');
      setDeliveries(pending);
    }
  };

  useEffect(() => {
    loadPendingDeliveries();
  }, []);

  const searchByCode = async () => {
    if (!withdrawalCode.trim()) {
      toast({
        variant: "destructive",
        title: "Digite um código",
        description: "Por favor, digite o código de retirada.",
      });
      return;
    }

    setIsSearching(true);
    
    try {
      // Buscar no Supabase primeiro
      console.log('🔍 Buscando entrega no Supabase com código:', withdrawalCode.trim());
      
      const { data: entrega, error: searchError } = await supabase
        .from('entregas')
        .select(`
          *,
          moradores (
            id,
            nome,
            telefone,
            apartamento,
            bloco
          )
        `)
        .eq('codigo_retirada', withdrawalCode.trim())
        .single();

      if (searchError) {
        console.error('❌ Erro ao buscar no Supabase:', searchError);
        
        // Se não encontrar no Supabase, buscar no localStorage
        const savedDeliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
        const delivery = savedDeliveries.find((d: Delivery) => 
          d.withdrawalCode === withdrawalCode.trim()
        );
        
        if (delivery) {
          console.log('✅ Entrega encontrada no localStorage:', delivery);
          setFoundDelivery(delivery);
          toast({
            title: "Encomenda encontrada!",
            description: `Encomenda para ${delivery.resident.name} (local)`,
          });
        } else {
          // Tentar buscar todas as entregas com este código para debug
          const { data: todasEntregas } = await supabase
            .from('entregas')
            .select('codigo_retirada, status, created_at')
            .eq('codigo_retirada', withdrawalCode.trim());
          
          console.log('🔍 Debug - Todas as entregas com este código:', todasEntregas);
          
          toast({
            variant: "destructive",
            title: "Código não encontrado",
            description: "Código inválido ou encomenda não registrada.",
          });
          setFoundDelivery(null);
        }
      } else if (entrega) {
        console.log('✅ Entrega encontrada no Supabase:', entrega);
        
        // Converter para o formato do Delivery
        const delivery: Delivery = {
          id: entrega.id,
          resident: {
            id: entrega.moradores.id,
            name: entrega.moradores.nome,
            phone: entrega.moradores.telefone,
          },
          apartmentInfo: {
            bloco: entrega.moradores.bloco || '',
            apartamento: entrega.moradores.apartamento,
          },
          withdrawalCode: entrega.codigo_retirada,
          photo: entrega.foto_url || '',
          observations: entrega.observacoes || '',
          timestamp: entrega.data_entrega,
          status: entrega.status
        };
        
        setFoundDelivery(delivery);
        toast({
          title: "Encomenda encontrada!",
          description: `Encomenda para ${delivery.resident.name} (${entrega.status})`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Código não encontrado",
          description: "Código inválido ou encomenda não registrada.",
        });
        setFoundDelivery(null);
      }
    } catch (error) {
      console.error('❌ Erro na busca:', error);
      toast({
        variant: "destructive",
        title: "Erro na busca",
        description: "Falha ao buscar encomenda.",
      });
      setFoundDelivery(null);
    } finally {
      setIsSearching(false);
    }
  };

  const confirmWithdrawal = async () => {
    if (!foundDelivery || !withdrawalDescription.trim()) {
      toast({
        variant: "destructive",
        title: "Descrição obrigatória",
        description: "Por favor, adicione uma descrição da retirada.",
      });
      return;
    }

    try {
      // Atualizar status no localStorage
      const savedDeliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
      const updatedDeliveries = savedDeliveries.map((d: Delivery) =>
        d.id === foundDelivery.id 
          ? { ...d, status: 'retirada', withdrawalTimestamp: new Date().toISOString(), withdrawalDescription }
          : d
      );
      
      localStorage.setItem('deliveries', JSON.stringify(updatedDeliveries));

      // Buscar e atualizar no Supabase pelo código de retirada
      try {
        console.log('🔍 Buscando entrega no Supabase com código:', foundDelivery.withdrawalCode);
        console.log('🔍 Status atual da entrega:', foundDelivery.status);
        
        // Primeiro, buscar a entrega pelo código de retirada (sem filtro de status)
        const { data: entrega, error: searchError } = await supabase
          .from('entregas')
          .select('*')
          .eq('codigo_retirada', foundDelivery.withdrawalCode)
          .single();

        if (searchError) {
          console.error('❌ Erro ao buscar entrega no Supabase:', searchError);
          
          // Tentar buscar sem o filtro single() para ver se existe
          const { data: todasEntregas, error: listError } = await supabase
            .from('entregas')
            .select('*')
            .eq('codigo_retirada', foundDelivery.withdrawalCode);
          
          console.log('🔍 Todas as entregas com este código:', todasEntregas);
          
          toast({ 
            variant: 'destructive', 
            title: 'Erro', 
            description: `Falha ao buscar entrega no banco de dados: ${searchError.message}` 
          });
          return;
        }

        if (!entrega) {
          console.log('⚠️ Entrega não encontrada no Supabase');
          toast({ 
            variant: 'destructive', 
            title: 'Erro', 
            description: 'Entrega não encontrada no banco de dados.' 
          });
          return;
        }

        console.log('✅ Entrega encontrada no Supabase:', entrega);
        console.log('📊 Status atual no banco:', entrega.status);

        // Verificar se já foi retirada
        if (entrega.status === 'retirada') {
          toast({ 
            variant: 'destructive', 
            title: 'Encomenda já retirada', 
            description: 'Esta encomenda já foi retirada anteriormente.' 
          });
          return;
        }

        // Atualizar a entrega no Supabase
        const { error: updateError } = await supabase
          .from('entregas')
          .update({
            status: 'retirada',
            data_retirada: new Date().toISOString(),
            descricao_retirada: withdrawalDescription,
            observacoes: foundDelivery.observations || null
          })
          .eq('id', entrega.id);

        if (updateError) {
          console.error('❌ Erro ao atualizar retirada no Supabase:', updateError);
          toast({ 
            variant: 'destructive', 
            title: 'Erro', 
            description: `Falha ao atualizar retirada: ${updateError.message}` 
          });
          return;
        }

        console.log('✅ Entrega atualizada com sucesso no Supabase');

      } catch (e) {
        console.error('❌ Erro ao atualizar retirada no Supabase:', e);
        toast({ 
          variant: 'destructive', 
          title: 'Erro', 
          description: 'Falha ao atualizar retirada no banco de dados.' 
        });
        return;
      }

      // Enviar notificação de retirada via WhatsApp
      try {
        const now = new Date();
        const data = now.toLocaleDateString('pt-BR');
        const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const response = await fetch('https://ofaifvyowixzktwvxrps.supabase.co/functions/v1/send-whatsapp-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: foundDelivery.resident.phone,
            message: `🏢 *${condominioNome || 'Condomínio'}*\n\n✅ *Encomenda Retirada*\n\nOlá *${foundDelivery.resident.name}*, sua encomenda foi retirada com sucesso!\n\n📅 Data: ${data}\n⏰ Hora: ${hora}\n🔑 Código: ${foundDelivery.withdrawalCode}\n📝 ${withdrawalDescription}\n\nNão responda esta mensagem, este é um atendimento automático.`,
            type: 'withdrawal',
            withdrawalData: {
              codigo: foundDelivery.withdrawalCode,
              morador: foundDelivery.resident.name,
              apartamento: foundDelivery.apartmentInfo.apartamento,
              bloco: foundDelivery.apartmentInfo.bloco,
              descricao: withdrawalDescription,
              data: data,
              hora: hora
            }
          }),
        });

        if (response.ok) {
          console.log('✅ WhatsApp withdrawal notification sent successfully');
        } else {
          console.error('❌ Failed to send WhatsApp withdrawal notification');
        }
      } catch (error) {
        console.error('❌ Error sending WhatsApp withdrawal notification:', error);
      }

      toast({
        title: "Retirada confirmada!",
        description: `Encomenda entregue para ${foundDelivery.resident.name}. WhatsApp enviado.`,
      });

      // Reset form
      setWithdrawalCode("");
      setFoundDelivery(null);
      setWithdrawalDescription("");
      loadPendingDeliveries();
      onChange?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao confirmar retirada.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-card bg-gradient-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <CheckCircle className="h-5 w-5 text-success" />
            Retirada de Encomendas
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Search by Code */}
      <Card className="shadow-card bg-gradient-card">
        <CardHeader>
          <CardTitle className="text-lg">Buscar por Código</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code" className="text-sm font-medium">
              Código de Retirada
            </Label>
            <div className="flex gap-3">
              <Input
                id="code"
                type="text"
                placeholder="Digite o código (5 dígitos)"
                value={withdrawalCode}
                onChange={(e) => setWithdrawalCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                className="h-12 text-lg text-center font-mono tracking-wider"
                maxLength={5}
              />
              <Button
                onClick={searchByCode}
                size="lg"
                disabled={isSearching || withdrawalCode.length !== 5}
              >
                {isSearching ? (
                  <>
                    <Search className="h-5 w-5 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Buscar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Found Delivery */}
      {foundDelivery && (
        <Card className="shadow-elevated bg-gradient-card border-2 border-success/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-success">
              <Package className="h-5 w-5" />
              Encomenda Encontrada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                  {getInitials(foundDelivery.resident.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground">
                  {foundDelivery.resident.name}
                </h3>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{foundDelivery.resident.phone}</span>
                  <Badge variant="secondary">
                    {foundDelivery.apartmentInfo.bloco ? 
                      `${foundDelivery.apartmentInfo.bloco}-${foundDelivery.apartmentInfo.apartamento}` :
                      foundDelivery.apartmentInfo.apartamento
                    }
                  </Badge>
                </div>
                {foundDelivery.resident.role && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {foundDelivery.resident.role}
                  </Badge>
                )}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Código de Retirada
                </Label>
                <p className="text-2xl font-bold font-mono text-primary">
                  {foundDelivery.withdrawalCode}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Data/Hora Chegada
                </Label>
                <p className="text-sm text-foreground">
                  {new Date(foundDelivery.timestamp).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Photo */}
            {foundDelivery.photo && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Foto da Encomenda
                </Label>
                <img
                  src={foundDelivery.photo}
                  alt="Encomenda"
                  className="w-full h-48 object-cover rounded-lg shadow-card mt-2"
                />
              </div>
            )}

            {/* Observations */}
            {foundDelivery.observations && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Observações
                </Label>
                <p className="text-sm text-foreground bg-muted p-3 rounded-lg mt-1">
                  {foundDelivery.observations}
                </p>
              </div>
            )}

            {/* Withdrawal Description */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Descrição da Retirada *
              </Label>
              <Textarea
                placeholder="Ex: Retirado pelo filho, Esposa retirou, etc..."
                value={withdrawalDescription}
                onChange={(e) => setWithdrawalDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Confirm Button */}
            <Button
              onClick={confirmWithdrawal}
              size="lg"
              variant="success"
              className="w-full"
              disabled={!withdrawalDescription.trim()}
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Confirmar Retirada
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pending Deliveries List */}
      <Card className="shadow-card bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-warning" />
            Encomendas Pendentes ({deliveries.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            💡 Clique em qualquer encomenda abaixo para selecioná-la automaticamente, ou digite o código manualmente acima.
          </p>
        </CardHeader>
        <CardContent>
          {deliveries.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma encomenda pendente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deliveries.map((delivery) => (
                <div 
                  key={delivery.id} 
                  className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors duration-200 border-2 border-transparent hover:border-primary/30"
                  onClick={() => {
                    // Auto-fill the withdrawal code and search
                    setWithdrawalCode(delivery.withdrawalCode);
                    // Simulate clicking the search button
                    setTimeout(() => {
                      searchByCode();
                    }, 100);
                  }}
                  title="Clique para selecionar esta encomenda"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                      {getInitials(delivery.resident.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {delivery.resident.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {delivery.apartmentInfo.bloco ? 
                        `${delivery.apartmentInfo.bloco}-${delivery.apartmentInfo.apartamento}` :
                        delivery.apartmentInfo.apartamento
                      }
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-mono font-bold text-primary">
                      {delivery.withdrawalCode}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(delivery.timestamp).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center gap-1">
                    <Badge variant="warning" className="shrink-0">
                      Pendente
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Clique aqui
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};