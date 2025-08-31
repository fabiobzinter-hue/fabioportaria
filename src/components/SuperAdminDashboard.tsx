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
          <CardTitle className="text-sm font-medium">Total Condomínios</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{condominios.length}</div>
          <p className="text-xs text-muted-foreground">
            Condomínios cadastrados no sistema
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Funcionários</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{funcionarios.length}</div>
          <p className="text-xs text-muted-foreground">
            Funcionários ativos: {funcionarios.filter(f => f.ativo).length}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Entregas</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{entregas.length}</div>
          <p className="text-xs text-muted-foreground">
            Últimas 100 entregas
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Últimas Atividades</CardTitle>
          <CardDescription>Resumo das atividades recentes do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Condomínios Recentes</h4>
                <div className="space-y-1">
                  {condominios.slice(0, 5).map(condo => (
                    <div key={condo.id} className="text-sm text-muted-foreground">
                      {condo.nome} - {condo.cidade}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Entregas Recentes</h4>
                <div className="space-y-1">
                  {entregas.slice(0, 5).map(entrega => (
                    <div key={entrega.id} className="text-sm text-muted-foreground">
                      {new Date(entrega.created_at).toLocaleDateString()} - {entrega.status}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCondominios = () => (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0">
        <h2 className="text-xl md:text-2xl font-bold">Gerenciar Condomínios</h2>
        <div className="flex w-full md:w-auto space-x-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Novo Condomínio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Condomínio</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo condomínio e do síndico responsável.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Condomínio</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="Ex: Residencial Vila Bela"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                    placeholder="Rua, número, bairro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => setFormData({...formData, cep: e.target.value})}
                    placeholder="00000-000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                    placeholder="Nome da cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone do Condomínio</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sindico_nome">Nome do Síndico</Label>
                  <Input
                    id="sindico_nome"
                    value={formData.sindico_nome}
                    onChange={(e) => setFormData({...formData, sindico_nome: e.target.value})}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sindico_cpf">CPF do Síndico</Label>
                  <Input
                    id="sindico_cpf"
                    value={formData.sindico_cpf}
                    onChange={(e) => setFormData({...formData, sindico_cpf: e.target.value})}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sindico_senha">Senha do Síndico</Label>
                  <Input
                    id="sindico_senha"
                    type="password"
                    value={formData.sindico_senha}
                    onChange={(e) => setFormData({...formData, sindico_senha: e.target.value})}
                    placeholder="Senha de acesso"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sindico_telefone">Telefone do Síndico</Label>
                  <Input
                    id="sindico_telefone"
                    value={formData.sindico_telefone}
                    onChange={(e) => setFormData({...formData, sindico_telefone: e.target.value})}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateCondominio}
                  disabled={!formData.nome.trim() || !formData.endereco.trim() || !formData.cep.trim() || !formData.cidade.trim()}
                >
                  Criar Condomínio
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showEditDialog} onOpenChange={(open) => {
            setShowEditDialog(open);
            if (!open) {
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
            }
          }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar Condomínio</DialogTitle>
                <DialogDescription>
                  Edite os dados do condomínio e do síndico responsável.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nome">Nome do Condomínio</Label>
                  <Input
                    id="edit-nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="Ex: Residencial Vila Bela"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-endereco">Endereço</Label>
                  <Input
                    id="edit-endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                    placeholder="Rua, número, bairro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cep">CEP</Label>
                  <Input
                    id="edit-cep"
                    value={formData.cep}
                    onChange={(e) => setFormData({...formData, cep: e.target.value})}
                    placeholder="00000-000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cidade">Cidade</Label>
                  <Input
                    id="edit-cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                    placeholder="Nome da cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-telefone">Telefone do Condomínio</Label>
                  <Input
                    id="edit-telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sindico_nome">Nome do Síndico</Label>
                  <Input
                    id="edit-sindico_nome"
                    value={formData.sindico_nome}
                    onChange={(e) => setFormData({...formData, sindico_nome: e.target.value})}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sindico_cpf">CPF do Síndico</Label>
                  <Input
                    id="edit-sindico_cpf"
                    value={formData.sindico_cpf}
                    onChange={(e) => setFormData({...formData, sindico_cpf: e.target.value})}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sindico_senha">Senha do Síndico</Label>
                  <Input
                    id="edit-sindico_senha"
                    type="password"
                    value={formData.sindico_senha}
                    onChange={(e) => setFormData({...formData, sindico_senha: e.target.value})}
                    placeholder="Senha de acesso"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sindico_telefone">Telefone do Síndico</Label>
                  <Input
                    id="edit-sindico_telefone"
                    value={formData.sindico_telefone}
                    onChange={(e) => setFormData({...formData, sindico_telefone: e.target.value})}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
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
                }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleUpdateCondominio}
                  disabled={!formData.nome.trim() || !formData.endereco.trim() || !formData.cep.trim() || !formData.cidade.trim()}
                >
                  Atualizar Condomínio
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Nome</TableHead>
                <TableHead className="hidden md:table-cell">Cidade</TableHead>
                <TableHead className="hidden md:table-cell">Síndico</TableHead>
                <TableHead className="hidden md:table-cell">Telefone</TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {condominios.map((condo) => (
                <TableRow key={condo.id}>
                  <TableCell className="font-medium">
                    <div>
                      <p className="truncate max-w-[150px]">{condo.nome}</p>
                      <p className="text-xs text-muted-foreground md:hidden">{condo.cidade}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{condo.cidade}</TableCell>
                  <TableCell className="hidden md:table-cell">{condo.sindico_nome || 'Não definido'}</TableCell>
                  <TableCell className="hidden md:table-cell">{condo.telefone || 'Não informado'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1 md:space-x-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditCondominio(condo)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteCondominio(condo.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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

  const renderFuncionarios = () => (
    <div className="space-y-4">
      <h2 className="text-xl md:text-2xl font-bold">Funcionários do Sistema</h2>
      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Nome</TableHead>
                <TableHead className="hidden md:table-cell">CPF</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="hidden md:table-cell">Condomínio</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funcionarios.map((func) => {
                const condo = condominios.find(c => c.id === func.condominio_id);
                return (
                  <TableRow key={func.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="truncate max-w-[150px]">{func.nome}</p>
                        <p className="text-xs text-muted-foreground md:hidden truncate max-w-[150px]">{condo?.nome || 'Não encontrado'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{func.cpf}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{func.cargo}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{condo?.nome || 'Não encontrado'}</TableCell>
                    <TableCell>
                      <Badge variant={func.ativo ? "default" : "destructive"}>
                        {func.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
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
                <TableHead>Data</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Condomínio</TableHead>
                <TableHead className="hidden md:table-cell">Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entregas.map((entrega) => {
                const condo = condominios.find(c => c.id === entrega.condominio_id);
                return (
                  <TableRow key={entrega.id}>
                    <TableCell>{new Date(entrega.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono">
                      <div>
                        <p>{entrega.codigo_retirada}</p>
                        <p className="text-xs text-muted-foreground md:hidden truncate max-w-[100px]">{condo?.nome || 'Não encontrado'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entrega.status === 'entregue' ? "default" : "outline"}>
                        {entrega.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{condo?.nome || 'Não encontrado'}</TableCell>
                    <TableCell className="max-w-xs truncate hidden md:table-cell">{entrega.observacoes || 'Nenhuma'}</TableCell>
                  </TableRow>
                );
              })}
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Super Admin</h1>
          <p className="text-sm text-muted-foreground">Controle total do sistema EntregasZap</p>
        </div>
        <Button variant="outline" size="sm" className="w-full md:w-auto" onClick={onBack}>
          Voltar ao Dashboard
        </Button>
      </div>

      <div className="w-full overflow-x-auto pb-2">
        <div className="flex space-x-2 border-b min-w-max">
        {[
          { key: 'overview', label: 'Visão Geral' },
          { key: 'condominios', label: 'Condomínios' },
          { key: 'funcionarios', label: 'Funcionários' },
          { key: 'entregas', label: 'Entregas' },
          { key: 'relatorios', label: 'Relatórios' },
        ].map((tab) => (
          <Button
            key={tab.key}
            variant={currentView === tab.key ? "default" : "ghost"}
            onClick={() => setCurrentView(tab.key as any)}
            className="rounded-b-none text-sm md:text-base px-2 md:px-4"
          >
            {tab.label}
          </Button>
        ))}
      </div>
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