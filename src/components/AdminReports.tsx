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

export const AdminReports = () => {
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
    const condoId = user?.funcionario?.condominio_id;
    if (condoId) {
      setUserCondominioId(condoId);
      loadData(condoId);
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadData = async (condominioId: string) => {
    try {
      setIsLoading(true);

      // 1) Buscar entregas básicas do condomínio
      const { data: entregasRaw, error: entError } = await supabase
        .from('entregas')
        .select('id, codigo_retirada, status, data_entrega, data_retirada, descricao_retirada, observacoes, foto_url, created_at, morador_id, funcionario_id')
        .order('created_at', { ascending: false });

      if (entError) throw entError;

      // 2) Buscar funcionários do condomínio para filtros e mapeamento
      const funcionarioIds = Array.from(new Set((entregasRaw || []).map(e => e.funcionario_id).filter(Boolean)));
      const { data: funcionariosData } = await supabase
        .from('funcionarios')
        .select('id, nome, cargo')
        .eq('condominio_id', condominioId)
        .in('id', funcionarioIds.length ? funcionarioIds : ['00000000-0000-0000-0000-000000000000'])
        .order('nome');

      // 3) Buscar moradores do condomínio
      const moradorIds = Array.from(new Set((entregasRaw || []).map(e => e.morador_id).filter(Boolean)));
      const { data: moradoresData } = await supabase
        .from('moradores')
        .select('id, nome, apartamento, bloco, telefone')
        .eq('condominio_id', condominioId)
        .in('id', moradorIds.length ? moradorIds : ['00000000-0000-0000-0000-000000000000'])
        .order('nome');

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
      const entregaDate = new Date(entrega.created_at);
      if (filtros.dataInicio) {
        const inicioDate = new Date(filtros.dataInicio);
        matchesDate = matchesDate && entregaDate >= inicioDate;
      }
      if (filtros.dataFim) {
        const fimDate = new Date(filtros.dataFim);
        fimDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && entregaDate <= fimDate;
      }
    }

    return matchesSearch && matchesStatus && matchesFuncionario && matchesMorador && matchesDate;
  });

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

    const csvData = filteredEntregas.map(entrega => [
      entrega.codigo_retirada,
      entrega.morador.nome,
      formatApartment(entrega.morador.apartamento, entrega.morador.bloco),
      entrega.funcionario.nome,
      getStatusText(entrega.status),
      formatDate(entrega.data_entrega),
      entrega.data_retirada ? formatDate(entrega.data_retirada) : '',
      entrega.observacoes || ''
    ]);

    const escapeCell = (cell: any) => String(cell).replace(/"/g, '""');
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${escapeCell(cell)}"`).join(separator))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_entregas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  if (isLoading || !userCondominioId) {
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
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
              />
            </div>

            {/* Data Fim */}
            <div className="space-y-2">
              <Label>Data Fim</Label>
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

