import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Building2, Users, Package, Plus, Edit, Trash2 } from 'lucide-react';
import { AdminReports } from './AdminReports';

type Condominio = Tables<'condominios'>;
type Funcionario = Tables<'funcionarios'>;
type Entrega = Tables<'entregas'>;

interface SuperAdminDashboardProps {
  onBack: () => void;
}

export const SuperAdminDashboard = ({ onBack }: SuperAdminDashboardProps) => {
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'overview' | 'condominios' | 'funcionarios' | 'entregas' | 'relatorios'>('overview');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCondominio, setEditingCondominio] = useState<Condominio | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    id: '',
    nome: '',
    endereco: '',
    cep: '',
    cidade: '',
    telefone: '',
    sindico_nome: '',
    sindico_cpf: '',
    sindico_senha: '',
    sindico_telefone: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [condominiosRes, funcionariosRes, entregasRes] = await Promise.all([
        supabase.from('condominios').select('*').order('nome'),
        supabase.from('funcionarios').select('*').order('nome'),
        supabase.from('entregas').select('*').order('created_at', { ascending: false }).limit(100)
      ]);

      if (condominiosRes.data) setCondominios(condominiosRes.data);
      if (funcionariosRes.data) setFuncionarios(funcionariosRes.data);
      if (entregasRes.data) setEntregas(entregasRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados do sistema',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCondominio = async () => {
    try {
      // Validação de campos obrigatórios
      if (!formData.nome.trim()) {
        toast({
          title: 'Erro',
          description: 'Nome do condomínio é obrigatório',
          variant: 'destructive'
        });
        return;
      }

      if (!formData.endereco.trim()) {
        toast({
          title: 'Erro',
          description: 'Endereço é obrigatório',
          variant: 'destructive'
        });
        return;
      }

      if (!formData.cep.trim()) {
        toast({
          title: 'Erro',
          description: 'CEP é obrigatório',
          variant: 'destructive'
        });
        return;
      }

      if (!formData.cidade.trim()) {
        toast({
          title: 'Erro',
          description: 'Cidade é obrigatória',
          variant: 'destructive'
        });
        return;
      }

      const condominioData = {
        nome: formData.nome.trim(),
        endereco: formData.endereco.trim(),
        cep: formData.cep.trim(),
        cidade: formData.cidade.trim(),
        telefone: formData.telefone.trim() || null,
        sindico_nome: formData.sindico_nome.trim() || null,
        sindico_cpf: formData.sindico_cpf.replace(/\D/g, '') || null,
        sindico_senha: formData.sindico_senha.trim() || null,
        sindico_telefone: formData.sindico_telefone.trim() || null
      };

      console.log('Criando condomínio com dados:', condominioData);

      // Inserção direta (RLS pode estar desabilitado para super admin)
      const { data, error } = await supabase
        .from('condominios')
        .insert(condominioData)
        .select();

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw error;
      }

      console.log('Condomínio criado com sucesso:', data);

      toast({
        title: 'Sucesso',
        description: 'Condomínio criado com sucesso!'
      });

      setShowCreateDialog(false);
      setFormData({
        id: '',
        nome: '',
        endereco: '',
        cep: '',
        cidade: '',
        telefone: '',
        sindico_nome: '',
        sindico_cpf: '',
        sindico_senha: '',
        sindico_telefone: ''
      });
      loadData();
    } catch (error: any) {
      console.error('Erro ao criar condomínio:', error);
      
      let errorMessage = 'Falha ao criar condomínio';
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      if (error?.details) {
        errorMessage += `: ${error.details}`;
      }
      
      if (error?.hint) {
        errorMessage += ` (Dica: ${error.hint})`;
      }
      
      // Erro específico de políticas RLS
      if (error?.code === '42501' || error?.message?.includes('permission denied')) {
        errorMessage = 'Erro de permissão: O super admin pode não ter permissão para criar condomínios. Verifique as políticas RLS.';
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteCondominio = async (id: string) => {
    // Validar que o ID não está vazio
    if (!id || id === '') {
      toast({
        title: 'Erro',
        description: 'ID do condomínio inválido',
        variant: 'destructive'
      });
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este condomínio? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      console.log('Excluindo condomínio:', id);
      
      const { error } = await supabase
        .from('condominios')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir condomínio:', error);
        throw error;
      }
      
      console.log('Condomínio excluído com sucesso');

      toast({
        title: 'Sucesso',
        description: 'Condomínio excluído com sucesso!'
      });
      
      loadData();
    } catch (error: any) {
      console.error('Erro ao excluir condomínio:', error);
      
      let errorMessage = 'Falha ao excluir condomínio';
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      if (error?.details) {
        errorMessage += `: ${error.details}`;
      }
      
      // Erro específico de políticas RLS
      if (error?.code === '42501' || error?.message?.includes('permission denied')) {
        errorMessage = 'Erro de permissão: O super admin pode não ter permissão para excluir condomínios. Verifique as políticas RLS.';
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleEditCondominio = (condominio: Condominio) => {
    setEditingCondominio(condominio);
    setFormData({
      id: condominio.id,
      nome: condominio.nome || '',
      endereco: condominio.endereco || '',
      cep: condominio.cep || '',
      cidade: condominio.cidade || '',
      telefone: condominio.telefone || '',
      sindico_nome: condominio.sindico_nome || '',
      sindico_cpf: condominio.sindico_cpf || '',
      sindico_senha: condominio.sindico_senha || '',
      sindico_telefone: condominio.sindico_telefone || ''
    });
    setShowEditDialog(true);
  };

  const handleUpdateCondominio = async () => {
    try {
      // Validar que o ID não está vazio
      if (!formData.id || formData.id === '') {
        toast({
          title: 'Erro',
          description: 'ID do condomínio inválido',
          variant: 'destructive'
        });
        return;
      }

      // Validação de campos obrigatórios
      if (!formData.nome.trim()) {
        toast({
          title: 'Erro',
          description: 'Nome do condomínio é obrigatório',
          variant: 'destructive'
        });
        return;
      }

      if (!formData.endereco.trim()) {
        toast({
          title: 'Erro',
          description: 'Endereço é obrigatório',
          variant: 'destructive'
        });
        return;
      }

      if (!formData.cep.trim()) {
        toast({
          title: 'Erro',
          description: 'CEP é obrigatório',
          variant: 'destructive'
        });
        return;
      }

      if (!formData.cidade.trim()) {
        toast({
          title: 'Erro',
          description: 'Cidade é obrigatória',
          variant: 'destructive'
        });
        return;
      }

      const condominioData = {
        nome: formData.nome.trim(),
        endereco: formData.endereco.trim(),
        cep: formData.cep.trim(),
        cidade: formData.cidade.trim(),
        telefone: formData.telefone.trim() || null,
        sindico_nome: formData.sindico_nome.trim() || null,
        sindico_cpf: formData.sindico_cpf.replace(/\D/g, '') || null,
        sindico_senha: formData.sindico_senha.trim() || null,
        sindico_telefone: formData.sindico_telefone.trim() || null
      };

      console.log('Atualizando condomínio:', formData.id, condominioData);

      // Atualização direta
      const { error } = await supabase
        .from('condominios')
        .update(condominioData)
        .eq('id', formData.id);

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw error;
      }

      console.log('Condomínio atualizado com sucesso');

      toast({
        title: 'Sucesso',
        description: 'Condomínio atualizado com sucesso!'
      });

      setShowEditDialog(false);
      setEditingCondominio(null);
      setFormData({
        id: '',
        nome: '',
        endereco: '',
        cep: '',
        cidade: '',
        telefone: '',
        sindico_nome: '',
        sindico_cpf: '',
        sindico_senha: '',
        sindico_telefone: ''
      });
      loadData();
    } catch (error: any) {
      console.error('Erro ao atualizar condomínio:', error);
      
      let errorMessage = 'Falha ao atualizar condomínio';
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      if (error?.details) {
        errorMessage += `: ${error.details}`;
      }
      
      if (error?.hint) {
        errorMessage += ` (Dica: ${error.hint})`;
      }
      
      // Erro específico de políticas RLS
      if (error?.code === '42501' || error?.message?.includes('permission denied')) {
        errorMessage = 'Erro de permissão: O super admin pode não ter permissão para atualizar condomínios. Verifique as políticas RLS.';
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Total Condomínios</CardTitle>
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{condominios.length}</div>
          <p className="text-sm text-muted-foreground">
            Condomínios registrados
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Total Funcionários</CardTitle>
          <Users className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{funcionarios.length}</div>
          <p className="text-sm text-muted-foreground">
            Funcionários ativos
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Total Entregas</CardTitle>
          <Package className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{entregas.length}</div>
          <p className="text-sm text-muted-foreground">
            Entregas registradas
          </p>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg">Condomínios Recentes</CardTitle>
          <CardDescription>
            Lista dos condomínios mais recentes cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm">Nome</TableHead>
                <TableHead className="text-sm">Cidade</TableHead>
                <TableHead className="text-sm">Telefone</TableHead>
                <TableHead className="text-sm">Síndico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {condominios.slice(0, 5).map((condominio) => (
                <TableRow key={condominio.id}>
                  <TableCell className="font-medium text-sm">{condominio.nome}</TableCell>
                  <TableCell className="text-sm">{condominio.cidade}</TableCell>
                  <TableCell className="text-sm">{condominio.telefone || '-'}</TableCell>
                  <TableCell className="text-sm">{condominio.sindico_nome || '-'}</TableCell>
                </TableRow>
              ))}
              {condominios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum condomínio cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderCondominios = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold">Gerenciamento de Condomínios</h2>
        <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Adicionar Condomínio
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm">Nome</TableHead>
                <TableHead className="text-sm">Endereço</TableHead>
                <TableHead className="text-sm">Cidade</TableHead>
                <TableHead className="text-sm">Telefone</TableHead>
                <TableHead className="text-sm">Síndico</TableHead>
                <TableHead className="text-sm">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {condominios.map((condominio) => {
                // Encontrar funcionários associados a este condomínio
                const funcs = funcionarios.filter(f => f.condominio_id === condominio.id);
                const sindico = funcs.find(f => f.cargo === 'sindico');
                
                return (
                  <TableRow key={condominio.id}>
                    <TableCell className="font-medium text-sm">{condominio.nome}</TableCell>
                    <TableCell className="text-sm">
                      <div className="max-w-[150px] truncate" title={condominio.endereco}>
                        {condominio.endereco}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{condominio.cidade}</TableCell>
                    <TableCell className="text-sm">{condominio.telefone || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {sindico ? (
                        <div>
                          <p>{sindico.nome}</p>
                          <p className="text-xs text-muted-foreground">{sindico.telefone || '-'}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCondominio(condominio)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCondominio(condominio.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {condominios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum condomínio cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderFuncionarios = () => (
    <div className="space-y-4">
      <h2 className="text-xl md:text-2xl font-bold">Gerenciamento de Funcionários</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm">Nome</TableHead>
                <TableHead className="text-sm">CPF</TableHead>
                <TableHead className="text-sm">Cargo</TableHead>
                <TableHead className="text-sm">Condomínio</TableHead>
                <TableHead className="text-sm">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funcionarios.map((func) => {
                const condo = condominios.find(c => c.id === func.condominio_id);
                return (
                  <TableRow key={func.id}>
                    <TableCell className="font-medium text-sm">{func.nome}</TableCell>
                    <TableCell className="text-sm">{func.cpf}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-sm">{func.cargo}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{condo?.nome || 'Não encontrado'}</TableCell>
                    <TableCell>
                      <Badge variant={func.ativo ? "default" : "destructive"} className="text-sm">
                        {func.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {funcionarios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum funcionário cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderEntregas = () => (
    <div className="space-y-4">
      <h2 className="text-xl md:text-2xl font-bold">Entregas Recentes</h2>
      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm">Data</TableHead>
                <TableHead className="text-sm">Código</TableHead>
                <TableHead className="text-sm">Status</TableHead>
                <TableHead className="text-sm hidden md:table-cell">Condomínio</TableHead>
                <TableHead className="text-sm hidden md:table-cell">Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entregas.map((entrega) => {
                const condo = condominios.find(c => c.id === entrega.condominio_id);
                return (
                  <TableRow key={entrega.id}>
                    <TableCell className="text-sm">{new Date(entrega.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono">
                      <div>
                        <p className="text-sm">{entrega.codigo_retirada}</p>
                        <p className="text-xs text-muted-foreground md:hidden truncate max-w-[100px]">{condo?.nome || 'Não encontrado'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entrega.status === 'entregue' ? "default" : "outline"} className="text-sm">
                        {entrega.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{condo?.nome || 'Não encontrado'}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm hidden md:table-cell">{entrega.observacoes || 'Nenhuma'}</TableCell>
                  </TableRow>
                );
              })}
              {entregas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma entrega registrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
  
  // Componente de relatórios específico para super admin
  // Movendo o estado para fora da função de renderização para evitar problemas de reinicialização
  const [selectedCondominioId, setSelectedCondominioId] = useState<string>('todos');
  
  const renderRelatorios = () => {
    return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold">Relatórios Administrativos</h2>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-card p-3 rounded-md border shadow-sm w-full sm:w-auto">
          <Label htmlFor="condominio-filter" className="whitespace-nowrap font-semibold">Filtrar por Condomínio:</Label>
          <Select 
            value={selectedCondominioId} 
            onValueChange={setSelectedCondominioId}
          >
            <SelectTrigger className="w-full sm:w-[300px]" id="condominio-filter">
              <SelectValue placeholder="Selecione um condomínio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Condomínios</SelectItem>
              {condominios.map((condo) => (
                <SelectItem key={condo.id} value={condo.id}>
                  {condo.nome} - {condo.cidade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="bg-sky-50 p-3 rounded-md border border-sky-200 text-sky-800 text-sm">
        <p className="flex items-center">
          <Building2 className="h-5 w-5 mr-2 text-sky-600 flex-shrink-0" />
          <span className="truncate">
            {selectedCondominioId === 'todos' 
              ? `Exibindo relatórios de todos os ${condominios.length} condomínios cadastrados.` 
              : `Exibindo relatórios detalhados do condomínio selecionado.`
            }
          </span>
        </p>
      </div>
      
      {condominios.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {selectedCondominioId === 'todos' ? (
            // Exibir todos os condomínios (modo compacto)
            condominios.map((condominio) => (
              <Card key={condominio.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50">
                  <CardTitle>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <span className="truncate">{condominio.nome}</span>
                      <Badge variant="outline">{condominio.cidade}</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-3">
                    <AdminReports superAdminMode={true} condominioId={condominio.id} />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // Exibir apenas o condomínio selecionado (modo detalhado)
            (() => {
              const condominio = condominios.find(c => c.id === selectedCondominioId);
              if (condominio) {
                return (
                  <Card>
                    <CardHeader className="bg-gray-50">
                      <CardTitle>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <span className="truncate">{condominio.nome}</span>
                          <Badge variant="outline">{condominio.cidade}</Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <AdminReports superAdminMode={true} condominioId={selectedCondominioId} />
                    </CardContent>
                  </Card>
                );
              }
              return (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p>Condomínio não encontrado</p>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedCondominioId('todos')} 
                      className="mt-4"
                    >
                      Voltar para todos os condomínios
                    </Button>
                  </CardContent>
                </Card>
              );
            })()
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <p>Nenhum condomínio cadastrado</p>
          </CardContent>
        </Card>
      )}
    </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 pb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Super Admin</h1>
          <p className="text-sm md:text-base text-muted-foreground">Controle total do sistema EntregasZap</p>
        </div>
        <Button variant="outline" size="sm" className="w-full md:w-auto" onClick={onBack}>
          Voltar ao Dashboard
        </Button>
      </div>

      {/* Fixed navigation without horizontal scrolling - responsive grid layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pb-2 mb-2">
        {[
          { key: 'overview', label: 'Visão Geral' },
          { key: 'condominios', label: 'Condomínios' },
          { key: 'funcionarios', label: 'Funcionários' },
          { key: 'entregas', label: 'Entregas' },
          { key: 'relatorios', label: 'Relatórios' },
        ].map((tab) => (
          <Button
            key={tab.key}
            variant={currentView === tab.key ? "default" : "outline"}
            onClick={() => setCurrentView(tab.key as any)}
            className="text-sm md:text-base py-2 h-auto whitespace-normal break-words text-center"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="mt-4 md:mt-6">
        {currentView === 'overview' && renderOverview()}
        {currentView === 'condominios' && renderCondominios()}
        {currentView === 'funcionarios' && renderFuncionarios()}
        {currentView === 'entregas' && renderEntregas()}
        {currentView === 'relatorios' && renderRelatorios()}
      </div>
    </div>
  );
};