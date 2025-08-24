import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Phone, ArrowLeft, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Resident {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role?: string;
}

interface ResidentListProps {
  residents: Resident[];
  apartmentInfo: { bloco: string; apartamento: string };
  onSelectResident: (resident: Resident) => void;
  onBack: () => void;
}

export const ResidentList = ({ 
  residents, 
  apartmentInfo, 
  onSelectResident, 
  onBack 
}: ResidentListProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
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
            <Badge variant="secondary" className="text-sm">
              {apartmentInfo.bloco} - {apartmentInfo.apartamento}
            </Badge>
          </div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <User className="h-5 w-5 text-primary" />
            Moradores Encontrados ({residents.length})
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {residents.map((resident) => (
          <Card 
            key={resident.id} 
            className="shadow-card bg-gradient-card hover:shadow-elevated transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-primary/20"
            onClick={() => onSelectResident(resident)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {getInitials(resident.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-foreground truncate">
                      {resident.name}
                    </h3>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">{resident.phone}</span>
                    </div>
                    {resident.role && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {resident.role}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 text-sm"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Registrar Entrega
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {residents.length === 0 && (
        <Card className="shadow-card bg-gradient-card">
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum morador encontrado
            </h3>
            <p className="text-muted-foreground">
              Verifique se o bloco e apartamento estão corretos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};