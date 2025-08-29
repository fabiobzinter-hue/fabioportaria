import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { 
  FileText, 
  Search, 
  Filter,
  Calendar,
  User,
  Package,
  Download,
  Eye
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth'; // Importar useAuth

interface Entrega {
  id: string;
  codigo_retirada: string;
  status: string;
  data_entrega: string;
  data_retirada: string | null;
  descricao_retirada: string | null;
  observacoes: string | null;
  foto_url: string | null;
  funcionario: {
    id: string;
    nome: string;
    cargo: string;
  };
  morador: {
    id: string;
    nome: string;
    apartamento: string;
    bloco: string;
    telefone: string;
  };
  created_at: string;
  condominio_id: string; // Adicionar para filtragem
}

interface Funcionario {
  id: string;
  nome: string;
}

interface Morador {
  id: string;
  nome: string;
}

interface AdminReportsProps {
  superAdminMode?: boolean;
  condominioId?: string;
}

export const AdminReports = ({ superAdminMode = false, condominioId: propCondominioId }: AdminReportsProps) => {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth(); // Obter usuário logado
  const [userCondominioId, setUserCondominioId] = useState<string | null>(null);

  // Filtros
  const [filtros, setFiltros] = useState({
    searchTerm: '',
    status: 'todos',
    funcionarioId: 'todos',
    moradorId: 'todos',
    dataInicio: '',
    dataFim: ''
  });

  useEffect(() => {
    console.log('AdminReports - useEffect triggered:', { superAdminMode, propCondominioId });
    
    if (superAdminMode) {
      // Para modo super admin
      if (propCondominioId && propCondominioId !== 'todos' && propCondominioId !== '') {
        // Se temos um ID específico de condomínio, carregamos os dados
        console.log('AdminReports - Carregando dados para condomínio específico:', propCondominioId);
        setUserCondominioId(propCondominioId);
        loadData(propCondominioId);
      } else {
        // Se estamos no modo "todos" ou vazio, não precisamos carregar dados
        console.log('AdminReports - Modo "todos" ou sem ID, sem carregamento');
        setIsLoading(false);
        setUserCondominioId(null);
        // Resetar dados para evitar mistura
        setEntregas([]);
        setFuncionarios([]);
        setMoradores([]);
      }
    } else {
      // Modo normal (não-super admin)
      const condoId = user?.funcionario?.condominio_id;
      if (condoId) {
        console.log('AdminReports - Modo normal, carregando para condomínio do usuário:', condoId);
        setUserCondominioId(condoId);
        loadData(condoId);
      } else {
        console.log('AdminReports - Modo normal, sem condomínio do usuário');
        setIsLoading(false);
      }
    }
  }, [user, superAdminMode, propCondominioId]);

  const loadData = async (condominioId: string) => {
    try {
      setIsLoading(true);
      
      // DEBUG: Log do condomínio que está sendo usado no filtro
      console.log('🏢 AdminReports - Carregando dados para condomínio:', condominioId);
      
      // Validar que o condomínio ID não está vazio
      if (!condominioId || condominioId === '') {
        throw new Error('ID do condomínio inválido');
      }

      // 1) Buscar entregas básicas do condomínio
      const { data: entregasRaw, error: entError } = await supabase
        .from('entregas')
        .select('id, codigo_retirada, status, data_entrega, data_retirada, descricao_retirada, observacoes, foto_url, created_at, morador_id, funcionario_id, condominio_id')
        .eq('condominio_id', condominioId)
        .order('created_at', { ascending: false });

      if (entError) throw entError;
      
      // DEBUG: Log das entregas encontradas
      console.log('📦 Entregas encontradas:', entregasRaw?.length || 0);
      console.log('🔍 Primeiras 3 entregas (debug):', entregasRaw?.slice(0, 3).map(e => ({
        id: e.id,
        codigo: e.codigo_retirada,
        condominio_id: e.condominio_id
      })));
      
      // DEBUG: Verificar se alguma entrega tem condominio_id diferente
      const entregasOutrosConds = entregasRaw?.filter(e => e.condominio_id !== condominioId) || [];
      if (entregasOutrosConds.length > 0) {
        console.error('⚠️ ERRO: Encontradas entregas de outros condomínios!', entregasOutrosConds.map(e => ({
          id: e.id,
          codigo: e.codigo_retirada,
          condominio_atual: condominioId,
          condominio_entrega: e.condominio_id
        })));
      }

      // 2) Buscar funcionários do condomínio para filtros e mapeamento
      const funcionarioIds = Array.from(new Set((entregasRaw || []).map(e => e.funcionario_id).filter(Boolean)));
      let funcionariosData = [];
      if (funcionarioIds.length > 0) {
        const { data, error: funcError } = await supabase
          .from('funcionarios')
          .select('id, nome, cargo')
          .eq('condominio_id', condominioId)
          .in('id', funcionarioIds);
        
        if (funcError) throw funcError;
        funcionariosData = data || [];
      }

      // 3) Buscar moradores do condomínio
      const moradorIds = Array.from(new Set((entregasRaw || []).map(e => e.morador_id).filter(Boolean)));
      let moradoresData = [];
      if (moradorIds.length > 0) {
        const { data, error: morError } = await supabase
          .from('moradores')
          .select('id, nome, apartamento, bloco, telefone')
          .eq('condominio_id', condominioId)
          .in('id', moradorIds);
        
        if (morError) throw morError;
        moradoresData = data || [];
      }

      // 4) Mapear por id
      const funcById = new Map((funcionariosData || []).map(f => [f.id, f]));
      const morById = new Map((moradoresData || []).map(m => [m.id, m]));

      const mapped: Entrega[] = (entregasRaw || []).map((r: any) => ({
        id: r.id,
        codigo_retirada: r.codigo_retirada,
        status: r.status,
        data_entrega: r.data_entrega,
        data_retirada: r.data_retirada,
        descricao_retirada: r.descricao_retirada,
        observacoes: r.observacoes,
        foto_url: r.foto_url,
        created_at: r.created_at,
        condominio_id: condominioId,
        funcionario: {
          id: r.funcionario_id,
          nome: funcById.get(r.funcionario_id)?.nome || 'Funcionário',
          cargo: funcById.get(r.funcionario_id)?.cargo || ''
        },
        morador: {
          id: r.morador_id,
          nome: morById.get(r.morador_id)?.nome || 'Morador',
          apartamento: morById.get(r.morador_id)?.apartamento || '',
          bloco: morById.get(r.morador_id)?.bloco || '',
          telefone: morById.get(r.morador_id)?.telefone || ''
        }
      }));

      setEntregas(mapped);
      setFuncionarios((funcionariosData || []).map(f => ({ id: f.id, nome: f.nome })));
      setMoradores((moradoresData || []).map(m => ({ id: m.id, nome: m.nome })));

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar relatórios."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEntregas = entregas.filter(entrega => {
    // Filtro por termo de busca
    const matchesSearch = 
      entrega.codigo_retirada.toLowerCase().includes(filtros.searchTerm.toLowerCase()) ||
      entrega.morador.nome.toLowerCase().includes(filtros.searchTerm.toLowerCase()) ||
      entrega.funcionario.nome.toLowerCase().includes(filtros.searchTerm.toLowerCase()) ||
      (entrega.observacoes && entrega.observacoes.toLowerCase().includes(filtros.searchTerm.toLowerCase()));

    // Filtro por status
    const matchesStatus = filtros.status === 'todos' || entrega.status === filtros.status;

    // Filtro por funcionário
    const matchesFuncionario = filtros.funcionarioId === 'todos' || entrega.funcionario.id === filtros.funcionarioId;

    // Filtro por morador
    const matchesMorador = filtros.moradorId === 'todos' || entrega.morador.id === filtros.moradorId;

    // Filtro por data
    let matchesDate = true;
    if (filtros.dataInicio || filtros.dataFim) {
      // Usar created_at para comparação de data
      const entregaDate = new Date(entrega.created_at);
      
      // DEBUG: Log da data da entrega para verificar formato
      console.log('📅 DEBUG - Entrega:', entrega.codigo_retirada, 'Created at:', entrega.created_at, 'Date obj:', entregaDate);
      
      if (filtros.dataInicio) {
        const inicioDate = new Date(filtros.dataInicio + 'T00:00:00.000Z');
        const match = entregaDate >= inicioDate;
        console.log('🔍 Data início - Entrega:', entregaDate.toISOString(), 'Filtro:', inicioDate.toISOString(), 'Match:', match);
        matchesDate = matchesDate && match;
      }
      if (filtros.dataFim) {
        const fimDate = new Date(filtros.dataFim + 'T23:59:59.999Z');
        const match = entregaDate <= fimDate;
        console.log('🔍 Data fim - Entrega:', entregaDate.toISOString(), 'Filtro:', fimDate.toISOString(), 'Match:', match);
        matchesDate = matchesDate && match;
      }
    }

    const finalMatch = matchesSearch && matchesStatus && matchesFuncionario && matchesMorador && matchesDate;
    
    // DEBUG: Log resultado final se estiver usando filtro de data
    if (filtros.dataInicio || filtros.dataFim) {
      console.log('✅ Resultado final para', entrega.codigo_retirada, ':', {
        matchesSearch,
        matchesStatus,
        matchesFuncionario, 
        matchesMorador,
        matchesDate,
        finalMatch
      });
    }

    return finalMatch;
  });

  // DEBUG: Log total de resultados filtrados
  console.log('📊 Total entregas:', entregas.length, 'Filtradas:', filteredEntregas.length, 'Filtros ativos:', filtros);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'warning';
      case 'retirada':
        return 'success';
      case 'cancelada':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'retirada':
        return 'Retirada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatApartment = (apartamento: string, bloco: string) => {
    return bloco ? `${bloco}-${apartamento}` : apartamento;
  };

  const exportToCSV = () => {
    // Excel PT-BR normalmente espera ; como separador
    const separator = ';';
    const headers = [
      'Código',
      'Morador',
      'Apartamento',
      'Funcionário',
      'Status',
      'Data Entrega',
      'Data Retirada',
      'Observações'
    ];

    const csvData = filteredEntregas.map(entrega => {
      // DEBUG: Log para verificar observações e descrição de retirada
      console.log('📝 Exportando entrega:', entrega.codigo_retirada, {
        observacoes: entrega.observacoes,
        descricao_retirada: entrega.descricao_retirada
      });
      
      // Combinar observações e descrição de retirada como no dashboard
      let observacoesCompletas = '';
      if (entrega.observacoes) {
        observacoesCompletas += entrega.observacoes;
      }
      if (entrega.descricao_retirada) {
        if (observacoesCompletas) {
          observacoesCompletas += ' | ';
        }
        observacoesCompletas += `Retirada: ${entrega.descricao_retirada}`;
      }
      
      return [
        entrega.codigo_retirada || '',
        entrega.morador.nome || '',
        formatApartment(entrega.morador.apartamento, entrega.morador.bloco),
        entrega.funcionario.nome || '',
        getStatusText(entrega.status),
        entrega.data_entrega ? formatDate(entrega.data_entrega) : '',
        entrega.data_retirada ? formatDate(entrega.data_retirada) : '',
        // Usar observações combinadas
        observacoesCompletas || ''
      ];
    });

    // Função melhorada para escapar células
    const escapeCell = (cell: any) => {
      if (cell === null || cell === undefined) {
        return '';
      }
      const cellStr = String(cell).replace(/"/g, '""');
      // Se contém quebra de linha, vírgula ou ponto e vírgula, envolver em aspas
      if (cellStr.includes('\n') || cellStr.includes(',') || cellStr.includes(';') || cellStr.includes('"')) {
        return `"${cellStr}"`;
      }
      return cellStr;
    };

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => escapeCell(cell)).join(separator))
      .join('\r\n');

    // Adicionar BOM UTF-8 para melhor compatibilidade com Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_entregas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('✅ Exportação concluída com', filteredEntregas.length, 'registros');
  };

  const clearFilters = () => {
    setFiltros({
      searchTerm: '',
      status: 'todos',
      funcionarioId: 'todos',
      moradorId: 'todos',
      dataInicio: '',
      dataFim: ''
    });
  };

  // Funções para filtros de data predefinidos
  const setDateFilter = (type: string) => {
    console.log('🗓️ Filtro de data acionado:', type);
    
    const hoje = new Date();
    let dataInicio = '';
    let dataFim = '';

    switch (type) {
      case 'hoje':
        dataInicio = dataFim = hoje.toISOString().split('T')[0];
        console.log('📅 Filtro HOJE - Data:', dataInicio);
        break;
      
      case 'ontem':
        const ontem = new Date(hoje);
        ontem.setDate(hoje.getDate() - 1);
        dataInicio = dataFim = ontem.toISOString().split('T')[0];
        console.log('📅 Filtro ONTEM - Data:', dataInicio);
        break;
      
      case 'ultimos7dias':
        const seteDiasAtras = new Date(hoje);
        seteDiasAtras.setDate(hoje.getDate() - 7);
        dataInicio = seteDiasAtras.toISOString().split('T')[0];
        dataFim = hoje.toISOString().split('T')[0];
        console.log('📅 Filtro ÚLTIMOS 7 DIAS - De:', dataInicio, 'Até:', dataFim);
        break;
      
      case 'estasemana':
        const inicioSemana = new Date(hoje);
        const diaSemana = hoje.getDay(); // 0 = domingo
        const diasParaSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
        inicioSemana.setDate(hoje.getDate() - diasParaSegunda);
        dataInicio = inicioSemana.toISOString().split('T')[0];
        dataFim = hoje.toISOString().split('T')[0];
        console.log('📅 Filtro ESTA SEMANA - De:', dataInicio, 'Até:', dataFim);
        break;
      
      case 'estemes':
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        dataInicio = inicioMes.toISOString().split('T')[0];
        dataFim = hoje.toISOString().split('T')[0];
        console.log('📅 Filtro ESTE MÊS - De:', dataInicio, 'Até:', dataFim);
        break;
      
      case 'mespassado':
        const inicioMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        const fimMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        dataInicio = inicioMesPassado.toISOString().split('T')[0];
        dataFim = fimMesPassado.toISOString().split('T')[0];
        console.log('📅 Filtro MÊS PASSADO - De:', dataInicio, 'Até:', dataFim);
        break;
      
      case 'ultimos30dias':
        const trintaDiasAtras = new Date(hoje);
        trintaDiasAtras.setDate(hoje.getDate() - 30);
        dataInicio = trintaDiasAtras.toISOString().split('T')[0];
        dataFim = hoje.toISOString().split('T')[0];
        console.log('📅 Filtro ÚLTIMOS 30 DIAS - De:', dataInicio, 'Até:', dataFim);
        break;
      
      default:
        console.log('❌ Tipo de filtro inválido:', type);
        return;
    }

    // Atualizar os filtros
    const novosFiltros = { ...filtros, dataInicio, dataFim };
    console.log('🔄 Atualizando filtros:', novosFiltros);
    setFiltros(novosFiltros);
  };

  // Versão compacta para exibir no card de SuperAdmin
  const renderCompactView = () => {
    // Se tivermos dados do condomínio, mostramos o resumo
    if (entregas.length > 0 || !isLoading) {
      return (
        <div className="p-3 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Total de Entregas:</span>
            <span className="font-bold">{entregas.length}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Pendentes:</span>
            <span className="font-bold text-yellow-600">{entregas.filter(e => e.status === 'pendente').length}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Entregues:</span>
            <span className="font-bold text-green-600">{entregas.filter(e => e.status === 'retirada').length}</span>
          </div>
        </div>
      );
    }
    
    // Senão, mostramos um status de carregamento ou mensagem
    return (
      <div className="p-3 space-y-2 text-gray-500">
        {isLoading ? (
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm">Sem entregas registradas</p>
          </div>
        )}
      </div>
    );
  };
  
  if (isLoading || (superAdminMode && propCondominioId && propCondominioId !== 'todos' && !userCondominioId)) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Versão compacta específica para visualização em lista de condomínios
  if (superAdminMode && (!propCondominioId || propCondominioId === 'todos' || !userCondominioId)) {
    return renderCompactView();
  }

  // Modo compacto para super admin
  if (superAdminMode) {
    // Se estamos em modo detalhado para um único condomínio
    const isSingleCondominio = propCondominioId && propCondominioId !== 'todos';
    
    if (isSingleCondominio) {
      // Versão detalhada para um único condomínio selecionado
      return (
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto">
                <Filter className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
              <Button onClick={exportToCSV} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filtros de Data Predefinidos */}
              <div className="mb-6">
                <Label className="text-sm font-medium mb-3 block">Filtros Rápidos de Data</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateFilter('hoje')}
                    className="text-xs"
                  >
                    Hoje
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateFilter('ontem')}
                    className="text-xs"
                  >
                    Ontem
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateFilter('ultimos7dias')}
                    className="text-xs"
                  >
                    Últimos 7 dias
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateFilter('estasemana')}
                    className="text-xs"
                  >
                    Esta semana
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateFilter('estemes')}
                    className="text-xs"
                  >
                    Este mês
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Busca */}
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Código, morador, funcionário..."
                      value={filtros.searchTerm}
                      onChange={(e) => setFiltros({ ...filtros, searchTerm: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={filtros.status}
                    onValueChange={(value) => setFiltros({ ...filtros, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Status</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="retirada">Retirada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Funcionário */}
                <div className="space-y-2">
                  <Label>Funcionário</Label>
                  <Select
                    value={filtros.funcionarioId}
                    onValueChange={(value) => setFiltros({ ...filtros, funcionarioId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Funcionários</SelectItem>
                      {funcionarios.map((funcionario) => (
                        <SelectItem key={funcionario.id} value={funcionario.id}>
                          {funcionario.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total</p>
                    <p className="text-2xl font-bold">{filteredEntregas.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pendentes</p>
                    <p className="text-2xl font-bold">
                      {filteredEntregas.filter(e => e.status === 'pendente').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Retiradas</p>
                    <p className="text-2xl font-bold">
                      {filteredEntregas.filter(e => e.status === 'retirada').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Funcionários</p>
                    <p className="text-2xl font-bold">
                      {new Set(filteredEntregas.map(e => e.funcionario.id)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Entregas ({filteredEntregas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Morador</TableHead>
                    <TableHead>Apartamento</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Entrega</TableHead>
                    <TableHead>Data Retirada</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntregas.map((entrega) => (
                    <TableRow key={entrega.id}>
                      <TableCell className="font-mono font-medium">
                        {entrega.codigo_retirada}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{entrega.morador.nome}</p>
                          <p className="text-sm text-gray-500">{entrega.morador.telefone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatApartment(entrega.morador.apartamento, entrega.morador.bloco)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{entrega.funcionario.nome}</p>
                          <p className="text-sm text-gray-500">{entrega.funcionario.cargo}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(entrega.status)}>
                          {getStatusText(entrega.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{formatDate(entrega.data_entrega).split(' ')[0]}</p>
                          <p className="text-gray-500">{formatDate(entrega.data_entrega).split(' ')[1]}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {entrega.data_retirada ? (
                          <div className="text-sm">
                            <p>{formatDate(entrega.data_retirada).split(' ')[0]}</p>
                            <p className="text-gray-500">{formatDate(entrega.data_retirada).split(' ')[1]}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {entrega.observacoes && (
                            <p className="text-sm text-gray-600 truncate" title={entrega.observacoes}>
                              {entrega.observacoes}
                            </p>
                          )}
                          {entrega.descricao_retirada && (
                            <p className="text-sm text-green-600 truncate" title={entrega.descricao_retirada}>
                              Retirada: {entrega.descricao_retirada}
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // Versão compacta (padrão) para exibir múltiplos condomínios
    return (
      <div className="p-3 space-y-4">
        {/* Estatísticas Simples */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-primary/10 p-2 rounded text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold">{filteredEntregas.length}</p>
          </div>
          <div className="bg-yellow-100 p-2 rounded text-center">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-xl font-bold">
              {filteredEntregas.filter(e => e.status === 'pendente').length}
            </p>
          </div>
          <div className="bg-green-100 p-2 rounded text-center">
            <p className="text-xs text-muted-foreground">Retiradas</p>
            <p className="text-xl font-bold">
              {filteredEntregas.filter(e => e.status === 'retirada').length}
            </p>
          </div>
        </div>
        
        {/* Lista simplificada */}
        <div className="max-h-60 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Morador</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntregas.slice(0, 10).map((entrega) => (
                <TableRow key={entrega.id}>
                  <TableCell className="font-mono font-medium">
                    {entrega.codigo_retirada}
                  </TableCell>
                  <TableCell>
                    {entrega.morador.nome}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(entrega.status)}>
                      {getStatusText(entrega.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDate(entrega.data_entrega).split(' ')[0]}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredEntregas.length > 10 && (
            <div className="text-center p-2 text-sm text-muted-foreground">
              Mostrando 10 de {filteredEntregas.length} registros
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Relatórios Administrativos</h2>
          <p className="text-sm sm:text-base text-gray-600">
            Acompanhe todas as entregas e atividades do condomínio
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto">
            <Filter className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
          <Button onClick={exportToCSV} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros de Data Predefinidos */}
          <div className="mb-6">
            <Label className="text-sm font-medium mb-3 block">Filtros Rápidos de Data</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateFilter('hoje')}
                className="text-xs"
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateFilter('ontem')}
                className="text-xs"
              >
                Ontem
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateFilter('ultimos7dias')}
                className="text-xs"
              >
                Últimos 7 dias
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateFilter('estasemana')}
                className="text-xs"
              >
                Esta semana
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateFilter('estemes')}
                className="text-xs"
              >
                Este mês
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateFilter('mespassado')}
                className="text-xs"
              >
                Mês passado
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateFilter('ultimos30dias')}
                className="text-xs"
              >
                Últimos 30 dias
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Busca */}
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Código, morador, funcionário..."
                  value={filtros.searchTerm}
                  onChange={(e) => setFiltros({ ...filtros, searchTerm: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filtros.status}
                onValueChange={(value) => setFiltros({ ...filtros, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="retirada">Retirada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Funcionário */}
            <div className="space-y-2">
              <Label>Funcionário</Label>
              <Select
                value={filtros.funcionarioId}
                onValueChange={(value) => setFiltros({ ...filtros, funcionarioId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Funcionários</SelectItem>
                  {funcionarios.map((funcionario) => (
                    <SelectItem key={funcionario.id} value={funcionario.id}>
                      {funcionario.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Morador */}
            <div className="space-y-2">
              <Label>Morador</Label>
              <Select
                value={filtros.moradorId}
                onValueChange={(value) => setFiltros({ ...filtros, moradorId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Moradores</SelectItem>
                  {moradores.map((morador) => (
                    <SelectItem key={morador.id} value={morador.id}>
                      {morador.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data Início */}
            <div className="space-y-2">
              <Label>Data Início (Personalizado)</Label>
              <Input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
              />
            </div>

            {/* Data Fim */}
            <div className="space-y-2">
              <Label>Data Fim (Personalizado)</Label>
              <Input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{filteredEntregas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold">
                  {filteredEntregas.filter(e => e.status === 'pendente').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Retiradas</p>
                <p className="text-2xl font-bold">
                  {filteredEntregas.filter(e => e.status === 'retirada').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Funcionários</p>
                <p className="text-2xl font-bold">
                  {new Set(filteredEntregas.map(e => e.funcionario.id)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Entregas ({filteredEntregas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Morador</TableHead>
                <TableHead>Apartamento</TableHead>
                <TableHead>Funcionário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Entrega</TableHead>
                <TableHead>Data Retirada</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntregas.map((entrega) => (
                <TableRow key={entrega.id}>
                  <TableCell className="font-mono font-medium">
                    {entrega.codigo_retirada}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{entrega.morador.nome}</p>
                      <p className="text-sm text-gray-500">{entrega.morador.telefone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatApartment(entrega.morador.apartamento, entrega.morador.bloco)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{entrega.funcionario.nome}</p>
                      <p className="text-sm text-gray-500">{entrega.funcionario.cargo}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(entrega.status)}>
                      {getStatusText(entrega.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{formatDate(entrega.data_entrega).split(' ')[0]}</p>
                      <p className="text-gray-500">{formatDate(entrega.data_entrega).split(' ')[1]}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {entrega.data_retirada ? (
                      <div className="text-sm">
                        <p>{formatDate(entrega.data_retirada).split(' ')[0]}</p>
                        <p className="text-gray-500">{formatDate(entrega.data_retirada).split(' ')[1]}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {entrega.observacoes && (
                        <p className="text-sm text-gray-600 truncate" title={entrega.observacoes}>
                          {entrega.observacoes}
                        </p>
                      )}
                      {entrega.descricao_retirada && (
                        <p className="text-sm text-green-600 truncate" title={entrega.descricao_retirada}>
                          Retirada: {entrega.descricao_retirada}
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

