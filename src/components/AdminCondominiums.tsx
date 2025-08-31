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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import {
  Building,
  Plus,
  Edit,
  Trash2,
  Search,
  User
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';

interface Condominio {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  cep: string;
  telefone: string;
  sindico_id: string | null; // Novo campo
  created_at: string;
  updated_at: string;
}

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
}

export const AdminCondominiums = () => {
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [administradores, setAdministradores] = useState<Funcionario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCondominio, setEditingCondominio] = useState<Condominio | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [userCondominioId, setUserCondominioId] = useState<string | null>(null);

  console.log('AdminCondominiums: Início. User:', user, 'User Condominio ID:', userCondominioId); // Log inicial

  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    cidade: '',
    cep: '',
    telefone: '',
    sindico_id: ''
  });

  useEffect(() => {
    const dataCargo = user?.funcionario?.cargo;
    const dataCondoId = user?.funcionario?.condominio_id || null;
    setUserCondominioId(dataCondoId);
    if (dataCargo === 'administrador' || dataCargo === 'sindico') {
      loadData(dataCondoId, dataCargo);
    } else if (dataCargo === 'super_administrador') {
      loadData(null, dataCargo);
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadData = async (condominioId: string | null, userRole: string) => {
    console.log('loadData: Iniciando carregamento de dados para condominioId:', condominioId, 'userRole:', userRole); // Log início loadData
    try {
      setIsLoading(true);

      let query = supabase.from('condominios').select('*').order('nome');
      if (userRole === 'administrador' && condominioId) {
        query = query.eq('id', condominioId); // Filtrar pelo próprio condomínio do admin
      }
      console.log('loadData: Executando consulta de condomínios.'); // Log consulta
      const { data: condominiosData, error: condError } = await query;
      console.log('loadData: Resultado consulta condomínios:', { condominiosData, condError }); // Log resultado
      if (condError) throw condError;

      // Carregar apenas administradores para a lista de síndicos
      console.log('loadData: Executando consulta de administradores.'); // Log consulta
      const { data: administradoresData, error: adminError } = await supabase
        .from('funcionarios')
        .select('id, nome, cargo')
        .eq('cargo', 'administrador')
        .order('nome');
      console.log('loadData: Resultado consulta administradores:', { administradoresData, adminError }); // Log resultado
      if (adminError) throw adminError;

      setCondominios((condominiosData || []).map(c => ({ ...c, sindico_id: null })));
      setAdministradores(administradoresData || []);

    } catch (error) {
      console.error('Erro ao carregar dados em loadData:', error); // Log mais específico
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar condomínios."
      });
    } finally {
      setIsLoading(false);
      console.log('loadData: setIsLoading(false) executado.'); // Log final
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCondominio) {
        const { error } = await supabase
          .from('condominios')
          .update({ ...formData })
          .eq('id', editingCondominio.id);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Condomínio atualizado com sucesso." });
      } else {
        const { error } = await supabase
          .from('condominios')
          .insert([{ ...formData }]);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Condomínio cadastrado com sucesso." });
      }
      setIsDialogOpen(false);
      resetForm();
      // Recarregar dados com base no papel do usuário
      const dataCargo = user?.funcionario?.cargo || 'administrador';
      const dataCondoId = user?.funcionario?.condominio_id || userCondominioId;
      loadData(dataCondoId, dataCargo);
    } catch (error: any) {
      console.error('Erro ao salvar condomínio:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao salvar condomínio."
      });
    }
  };

  const handleEdit = (condominio: Condominio) => {
    setEditingCondominio(condominio);
    setFormData({
      nome: condominio.nome,
      endereco: condominio.endereco,
      cidade: condominio.cidade,
      cep: condominio.cep,
      telefone: condominio.telefone || '',
      sindico_id: condominio.sindico_id || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este condomínio?')) return;
    try {
      const { error } = await supabase
        .from('condominios')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Condomínio excluído com sucesso." });
      // Recarregar dados com base no papel do usuário
      const dataCargo = user?.funcionario?.cargo || 'administrador';
      const dataCondoId = user?.funcionario?.condominio_id || userCondominioId;
      loadData(dataCondoId, dataCargo);
    } catch (error: any) {
      console.error('Erro ao excluir condomínio:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao excluir condomínio."
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      endereco: '',
      cidade: '',
      cep: '',
      telefone: '',
      sindico_id: ''
    });
    setEditingCondominio(null);
  };

  const filteredCondominios = condominios.filter(condominio =>
    condominio.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    condominio.endereco.toLowerCase().includes(searchTerm.toLowerCase()) ||
    condominio.cidade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSindicoNome = (sindicoId: string | null) => {
    return administradores.find(admin => admin.id === sindicoId)?.nome || 'Não Atribuído';
  };

  if (isLoading || !user?.funcionario?.id) {
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Condomínios</h2>
          <p className="text-gray-600">
            Gerencie os condomínios na plataforma
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Condomínio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingCondominio ? 'Editar Condomínio' : 'Novo Condomínio'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do Condomínio"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, número, bairro"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="Cidade"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    placeholder="00000-000"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(DD) 99999-9999"
                />
              </div>
              {/* Seleção de Síndico */}
              {user && user.funcionario.cargo === 'super_administrador' && ( // Apenas super-admin pode atribuir síndico
                <div className="space-y-2">
                  <Label htmlFor="sindico">Síndico (Administrador)</Label>
                  <Select
                    value={formData.sindico_id}
                    onValueChange={(value) => setFormData({ ...formData, sindico_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar Síndico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Não Atribuído</SelectItem>
                      {administradores.map((admin) => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCondominio ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar condomínios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Condomínios ({filteredCondominios.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Síndico</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCondominios.map((condominio) => (
                <TableRow key={condominio.id}>
                  <TableCell className="font-medium">{condominio.nome}</TableCell>
                  <TableCell>{condominio.endereco}, {condominio.cidade} - {condominio.cep}</TableCell>
                  <TableCell>{condominio.telefone}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      <User className="h-3 w-3 mr-1" />
                      {getSindicoNome(condominio.sindico_id)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(condominio)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(condominio.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
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
};
