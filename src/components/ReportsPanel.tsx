import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  Package, 
  Clock,
  CheckCircle,
  Search,
  RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ReportsPanelProps {
  onBack: () => void;
  condominioId?: string;
}

interface ReportItem {
  id: string;
  residentName: string;
  apartment: string;
  phone: string;
  timestamp: string;
  status: string;
  photo?: string | null;
}

export const ReportsPanel = ({ onBack, condominioId }: ReportsPanelProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "pendente" | "retirada">("todos");
  const [items, setItems] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('📊 Carregando relatórios do Supabase...');
        console.log('🏢 Filtrando por condomínio:', condominioId);
        
        const baseQuery = supabase
          .from('entregas')
          .select(`id, codigo_retirada, created_at, data_entrega, data_retirada, descricao_retirada, observacoes, status, foto_url, morador_id`)
          .eq('condominio_id', condominioId)
          .order('created_at', { ascending: false })
          .limit(100);

        const { data, error } = await baseQuery;

        if (error) {
          console.error('❌ Erro ao buscar entregas:', error);
          throw error;
        }

        console.log('✅ Entregas carregadas:', data?.length || 0);

        // Buscar dados dos moradores para exibir nome/telefone/apto
        const moradorIds = (data || []).map(r => r.morador_id);
        const { data: moradores, error: moradoresError } = await supabase
          .from('moradores')
          .select('id, nome, telefone, apartamento, bloco')
          .in('id', moradorIds);

        if (moradoresError) {
          console.error('❌ Erro ao buscar moradores:', moradoresError);
        }

        const moradorById = new Map((moradores || []).map(m => [m.id, m]));

        const mapped: ReportItem[] = (data || []).map(r => {
          const m = moradorById.get(r.morador_id);
          return {
            id: r.id,
            residentName: m?.nome || 'Morador',
            apartment: m?.bloco ? `${m.bloco}-${m.apartamento}` : (m?.apartamento || ''),
            phone: m?.telefone || '',
            timestamp: new Date(r.data_entrega || r.created_at).toLocaleString('pt-BR'),
            status: r.status,
            photo: r.foto_url,
          };
        });

        console.log('📊 Relatórios processados:', mapped.length);
        setItems(mapped);
      } catch (e: any) {
        console.error('❌ Erro ao carregar relatórios:', e);
        setError(e.message || 'Erro ao carregar relatórios');
      } finally {
        setIsLoading(false);
      }
    };
    
    load();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(load, 30000);
    
    return () => clearInterval(interval);
  }, [condominioId]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getStatusVariant = (status: string) => {
    return status === "retirada" ? "success" : "warning";
  };

  const getStatusIcon = (status: string) => {
    return status === "retirada" ? CheckCircle : Clock;
  };

  const filteredDeliveries = items.filter(delivery => {
    const matchesSearch = delivery.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.apartment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || delivery.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalDeliveries = filteredDeliveries.length;
  const pendingDeliveries = filteredDeliveries.filter(d => d.status === "pendente").length;
  const completedDeliveries = filteredDeliveries.filter(d => d.status === "retirada").length;

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
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setIsLoading(true);
                  // Recarregar dados
                  const load = async () => {
                    try {
                      const baseQuery = supabase
                        .from('entregas')
                        .select(`id, codigo_retirada, created_at, data_entrega, data_retirada, descricao_retirada, observacoes, status, foto_url, morador_id`)
                        .eq('condominio_id', condominioId)
                        .order('created_at', { ascending: false })
                        .limit(100);

                       const { data, error } = await baseQuery;

                      if (error) throw error;

                      const moradorIds = (data || []).map(r => r.morador_id);
                      const { data: moradores } = await supabase
                        .from('moradores')
                        .select('id, nome, telefone, apartamento, bloco')
                        .in('id', moradorIds);

                      const moradorById = new Map((moradores || []).map(m => [m.id, m]));

                      const mapped: ReportItem[] = (data || []).map(r => {
                        const m = moradorById.get(r.morador_id);
                        return {
                          id: r.id,
                          residentName: m?.nome || 'Morador',
                          apartment: m?.bloco ? `${m.bloco}-${m.apartamento}` : (m?.apartamento || ''),
                          phone: m?.telefone || '',
                          timestamp: new Date(r.data_entrega || r.created_at).toLocaleString('pt-BR'),
                          status: r.status,
                          photo: r.foto_url,
                        };
                      });

                      setItems(mapped);
                    } catch (e: any) {
                      setError(e.message || 'Erro ao atualizar');
                    } finally {
                      setIsLoading(false);
                    }
                  };
                  load();
                }}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-5 w-5 text-primary" />
            Relatório de Entregas
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total de Entregas
                </p>
                <p className="text-2xl font-bold text-foreground">{totalDeliveries}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pendentes
                </p>
                <p className="text-2xl font-bold text-warning">{pendingDeliveries}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Concluídas
                </p>
                <p className="text-2xl font-bold text-success">{completedDeliveries}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-card bg-gradient-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por morador ou apartamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "todos" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("todos")}
              >
                Todos
              </Button>
              <Button
                variant={statusFilter === "pendente" ? "warning" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("pendente")}
              >
                Pendentes
              </Button>
              <Button
                variant={statusFilter === "retirada" ? "success" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("retirada")}
              >
                Entregues
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries List */}
      <div className="space-y-4">
        {isLoading && (
          <Card className="shadow-card bg-gradient-card">
            <CardContent className="p-6">Carregando...</CardContent>
          </Card>
        )}
        {error && (
          <Card className="shadow-card bg-gradient-card">
            <CardContent className="p-6 text-destructive">{error}</CardContent>
          </Card>
        )}
        {filteredDeliveries.map((delivery) => {
          const StatusIcon = getStatusIcon(delivery.status);
          return (
            <Card key={delivery.id} className="shadow-card bg-gradient-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {getInitials(delivery.residentName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">
                        {delivery.residentName}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {delivery.apartment}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {delivery.phone}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {delivery.timestamp}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={getStatusVariant(delivery.status)}
                      className="flex items-center gap-1"
                    >
                      <StatusIcon className="h-3 w-3" />
                      {delivery.status === "retirada" ? "Entregue" : "Pendente"}
                    </Badge>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Ver Detalhes
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Detalhes da Entrega</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2 text-sm">
                          <div><strong>Morador:</strong> {delivery.residentName}</div>
                          <div><strong>Apartamento:</strong> {delivery.apartment}</div>
                          <div><strong>Telefone:</strong> {delivery.phone}</div>
                          <div><strong>Data/Hora:</strong> {delivery.timestamp}</div>
                          <div><strong>Status:</strong> {delivery.status}</div>
                          {delivery.photo && (
                            <img src={delivery.photo} alt="Foto" className="w-full h-48 object-cover rounded" />
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredDeliveries.length === 0 && !isLoading && !error && (
        <Card className="shadow-card bg-gradient-card">
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhuma entrega encontrada
            </h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros ou termo de busca.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};