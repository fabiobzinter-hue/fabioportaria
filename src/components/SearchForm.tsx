import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, MapPin } from "lucide-react";

interface SearchFormProps {
  onSearch: (bloco: string | null, apartamento: string) => void;
}

export const SearchForm = ({ onSearch }: SearchFormProps) => {
  const [bloco, setBloco] = useState("");
  const [apartamento, setApartamento] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apartamento.trim()) {
      // Bloco é opcional - passa null se vazio
      onSearch(bloco.trim() || null, apartamento.trim());
    }
  };

  return (
    <Card className="shadow-card bg-gradient-card">
      <CardHeader className="pb-4 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Buscar Apartamento
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="bloco" className="text-sm font-medium">
                Bloco (Opcional)
              </Label>
              <Input
                id="bloco"
                type="text"
                placeholder="Ex: A, B, C (se houver)"
                value={bloco}
                onChange={(e) => setBloco(e.target.value.toUpperCase())}
                className="h-11 sm:h-12 text-base sm:text-lg text-center font-semibold"
                maxLength={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="apartamento" className="text-sm font-medium">
                Apartamento
              </Label>
              <Input
                id="apartamento"
                type="text"
                placeholder="Ex: 1905, 101"
                value={apartamento}
                onChange={(e) => setApartamento(e.target.value)}
                className="h-11 sm:h-12 text-base sm:text-lg text-center font-semibold"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            variant="large"
            className="w-full h-12 sm:h-14 text-base sm:text-lg"
            disabled={!apartamento.trim()}
          >
            <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Buscar Moradores
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};