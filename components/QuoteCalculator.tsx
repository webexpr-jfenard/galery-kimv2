import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  ArrowLeft,
  Calculator,
  Users,
  Camera,
  Edit,
  Clock,
  Euro,
  Settings
} from "lucide-react";

interface QuoteData {
  halfDayRate: number;
  fullDayRate: number;
  postProdRateUnder10: number;
  postProdRateOver10: number;
  numberOfPeople: number;
}

export function QuoteCalculator() {
  const [quoteData, setQuoteData] = useState<QuoteData>({
    halfDayRate: 500,
    fullDayRate: 800,
    postProdRateUnder10: 50,
    postProdRateOver10: 40,
    numberOfPeople: 10
  });

  const [isEditingRates, setIsEditingRates] = useState(false);

  // Calculate quote based on number of people
  const calculateQuote = () => {
    const { numberOfPeople, halfDayRate, fullDayRate, postProdRateUnder10, postProdRateOver10 } = quoteData;

    // Calculate shooting cost - if more than 10 people, use full day rate
    let shootingCost = 0;
    let shootingDescription = '';

    if (numberOfPeople <= 10) {
      shootingCost = halfDayRate;
      shootingDescription = '1 demi-journée';
    } else {
      // Compare full day vs multiple half days
      const halfDaySessions = Math.ceil(numberOfPeople / 10);
      const multipleHalfDaysCost = halfDaySessions * halfDayRate;

      if (fullDayRate < multipleHalfDaysCost) {
        shootingCost = fullDayRate;
        shootingDescription = '1 journée complète';
      } else {
        shootingCost = multipleHalfDaysCost;
        shootingDescription = `${halfDaySessions} demi-journées`;
      }
    }

    // Calculate post-production cost
    let postProdCost = 0;
    if (numberOfPeople <= 10) {
      postProdCost = numberOfPeople * postProdRateUnder10;
    } else {
      // First 10 people at regular rate
      postProdCost = 10 * postProdRateUnder10;
      // Additional people at reduced rate
      const additionalPeople = numberOfPeople - 10;
      postProdCost += additionalPeople * postProdRateOver10;
    }

    const subtotal = shootingCost + postProdCost;
    const tva = subtotal * 0.20; // 20% TVA
    const totalTTC = subtotal + tva;

    return {
      shootingCost,
      shootingDescription,
      postProdCost,
      subtotal,
      tva,
      totalTTC
    };
  };

  const quote = calculateQuote();

  const handleNumberOfPeopleChange = (value: string) => {
    const num = parseInt(value) || 0;
    setQuoteData(prev => ({ ...prev, numberOfPeople: Math.max(1, num) }));
  };

  const handleRateChange = (field: keyof QuoteData, value: string) => {
    const num = parseFloat(value) || 0;
    setQuoteData(prev => ({ ...prev, [field]: Math.max(0, num) }));
  };

  return (
    <div className="min-h-screen bg-background-light">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.appRouter.navigateTo('/admin')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à l'admin
              </Button>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calculator className="h-6 w-6 text-blue-600" />
                  </div>
                  Calculateur de Devis
                </h1>
                <p className="text-muted-foreground">
                  Génération automatique de devis photo selon le nombre de participants
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingRates(!isEditingRates)}
            >
              <Settings className="h-4 w-4 mr-2" />
              {isEditingRates ? 'Verrouiller tarifs' : 'Modifier tarifs'}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Configuration du Devis
              </CardTitle>
              <CardDescription>
                Saisissez le nombre de personnes et ajustez les tarifs si nécessaire
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Number of People */}
              <div className="space-y-2">
                <Label htmlFor="numberOfPeople" className="text-base font-medium">
                  Nombre de personnes *
                </Label>
                <Input
                  id="numberOfPeople"
                  type="number"
                  min="1"
                  value={quoteData.numberOfPeople}
                  onChange={(e) => handleNumberOfPeopleChange(e.target.value)}
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  {quoteData.numberOfPeople > 10 ? 'Plus de 10 personnes : journée complète recommandée' : 'Jusqu\'à 10 personnes : demi-journée suffisante'}
                </p>
              </div>

              <Separator />

              {/* Rate Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Tarifs Unitaires</h3>
                  {isEditingRates && (
                    <Badge variant="secondary">
                      <Edit className="h-3 w-3 mr-1" />
                      Modification activée
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">

                  {/* Half Day Rate */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Demi-journée (jusqu'à 10 personnes)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={quoteData.halfDayRate}
                        onChange={(e) => handleRateChange('halfDayRate', e.target.value)}
                        disabled={!isEditingRates}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground">€ HT</span>
                    </div>
                  </div>

                  {/* Full Day Rate */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Journée complète (plus de 10 personnes)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={quoteData.fullDayRate}
                        onChange={(e) => handleRateChange('fullDayRate', e.target.value)}
                        disabled={!isEditingRates}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground">€ HT</span>
                    </div>
                  </div>

                  {/* Post-prod Under 10 */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Post-production (jusqu'à 10 personnes)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={quoteData.postProdRateUnder10}
                        onChange={(e) => handleRateChange('postProdRateUnder10', e.target.value)}
                        disabled={!isEditingRates}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground">€ HT / personne</span>
                    </div>
                  </div>

                  {/* Post-prod Over 10 */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Post-production (au-delà de 10 personnes)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={quoteData.postProdRateOver10}
                        onChange={(e) => handleRateChange('postProdRateOver10', e.target.value)}
                        disabled={!isEditingRates}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground">€ HT / personne (tarif dégressif)</span>
                    </div>
                  </div>

                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quote Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5 text-green-600" />
                Devis Calculé
              </CardTitle>
              <CardDescription>
                Calcul automatique basé sur {quoteData.numberOfPeople} personne{quoteData.numberOfPeople > 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Quote Details */}
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Prestation Shooting
                  </h3>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">
                      {quote.shootingDescription}
                    </span>
                    <span className="font-medium">{quote.shootingCost}€ HT</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Installation + prises de vue
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Post-production
                  </h3>
                  {quoteData.numberOfPeople <= 10 ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">
                        {quoteData.numberOfPeople} personnes × {quoteData.postProdRateUnder10}€ HT
                      </span>
                      <span className="font-medium">{quote.postProdCost}€ HT</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span>10 premières personnes × {quoteData.postProdRateUnder10}€ HT</span>
                        <span>{10 * quoteData.postProdRateUnder10}€ HT</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span>{quoteData.numberOfPeople - 10} personnes supplémentaires × {quoteData.postProdRateOver10}€ HT</span>
                        <span>{(quoteData.numberOfPeople - 10) * quoteData.postProdRateOver10}€ HT</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Post-production</span>
                        <span className="font-medium">{quote.postProdCost}€ HT</span>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Retouche professionnelle (lumière, contraste, peau, détails)
                  </p>
                </div>

                <Separator />

                {/* Subtotal */}
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold">Sous-total HT</span>
                  <span className="font-bold">{quote.subtotal}€</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">TVA (20%)</span>
                  <span className="text-muted-foreground">{quote.tva.toFixed(2)}€</span>
                </div>

                <div className="flex justify-between items-center text-xl font-bold text-primary bg-primary/10 p-3 rounded-lg">
                  <span>Total TTC</span>
                  <span>{quote.totalTTC.toFixed(2)}€</span>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}