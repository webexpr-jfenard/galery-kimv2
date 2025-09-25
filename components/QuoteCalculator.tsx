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
  // Settings
  maxPeopleHalfDay: number;
  maxPeopleRegularRate: number;
}

export function QuoteCalculator() {
  const [quoteData, setQuoteData] = useState<QuoteData>({
    halfDayRate: 500,
    fullDayRate: 800,
    postProdRateUnder10: 50,
    postProdRateOver10: 40,
    numberOfPeople: 10,
    // Settings
    maxPeopleHalfDay: 10,
    maxPeopleRegularRate: 10
  });

  const [isEditingRates, setIsEditingRates] = useState(false);

  // Calculate quote based on number of people
  const calculateQuote = () => {
    const { numberOfPeople, halfDayRate, fullDayRate, postProdRateUnder10, postProdRateOver10, maxPeopleHalfDay, maxPeopleRegularRate } = quoteData;

    // Calculate shooting cost - use configurable threshold
    let shootingCost = 0;
    let shootingDescription = '';

    if (numberOfPeople <= maxPeopleHalfDay) {
      shootingCost = halfDayRate;
      shootingDescription = '1 demi-journée';
    } else {
      // Calculate multiple half days cost
      const halfDaySessions = Math.ceil(numberOfPeople / maxPeopleHalfDay);
      const multipleHalfDaysCost = halfDaySessions * halfDayRate;

      // Compare all options: full day vs multiple half days
      if (fullDayRate < multipleHalfDaysCost) {
        shootingCost = fullDayRate;
        shootingDescription = '1 journée complète';
      } else {
        shootingCost = multipleHalfDaysCost;
        shootingDescription = `${halfDaySessions} demi-journées`;
      }
    }

    // Calculate post-production cost - use configurable threshold
    let postProdCost = 0;
    if (numberOfPeople <= maxPeopleRegularRate) {
      postProdCost = numberOfPeople * postProdRateUnder10;
    } else {
      // First X people at regular rate
      postProdCost = maxPeopleRegularRate * postProdRateUnder10;
      // Additional people at reduced rate
      const additionalPeople = numberOfPeople - maxPeopleRegularRate;
      postProdCost += additionalPeople * postProdRateOver10;
    }

    const total = shootingCost + postProdCost;

    return {
      shootingCost,
      shootingDescription,
      postProdCost,
      total
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
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Unit Rates Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5 text-green-600" />
                  Tarifs Unitaires
                </CardTitle>
                <CardDescription>
                  Configuration des prix de base
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingRates(!isEditingRates)}
                className="shrink-0"
              >
                <Settings className="h-4 w-4 mr-2" />
                {isEditingRates ? 'Verrouiller' : 'Modifier'}
                {isEditingRates && (
                  <Badge variant="secondary" className="ml-2">
                    <Edit className="h-3 w-3 mr-1" />
                    Actif
                  </Badge>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Shooting rates - vertical stack */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Prestations Shooting
                </h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Demi-journée</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={quoteData.halfDayRate}
                        onChange={(e) => handleRateChange('halfDayRate', e.target.value)}
                        disabled={!isEditingRates}
                        className="pr-12"
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">€ HT</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Journée complète</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={quoteData.fullDayRate}
                        onChange={(e) => handleRateChange('fullDayRate', e.target.value)}
                        disabled={!isEditingRates}
                        className="pr-12"
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">€ HT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Post-production rates */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Post-production
                </h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Tarif normal</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={quoteData.postProdRateUnder10}
                        onChange={(e) => handleRateChange('postProdRateUnder10', e.target.value)}
                        disabled={!isEditingRates}
                        className="pr-16"
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">€/pers</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Tarif dégressif</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={quoteData.postProdRateOver10}
                        onChange={(e) => handleRateChange('postProdRateOver10', e.target.value)}
                        disabled={!isEditingRates}
                        className="pr-16"
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">€/pers</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings - thresholds */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Seuils
                </h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Seuil demi-journée</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="1"
                        value={quoteData.maxPeopleHalfDay}
                        onChange={(e) => handleRateChange('maxPeopleHalfDay', e.target.value)}
                        disabled={!isEditingRates}
                        className="pr-12"
                        placeholder="10"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">pers</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Seuil tarif normal</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="1"
                        value={quoteData.maxPeopleRegularRate}
                        onChange={(e) => handleRateChange('maxPeopleRegularRate', e.target.value)}
                        disabled={!isEditingRates}
                        className="pr-12"
                        placeholder="10"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">pers</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info column */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Informations
                </h3>
                <div className="space-y-3 text-xs text-muted-foreground">
                  <div className="p-2 bg-muted/30 rounded">
                    <p className="font-medium mb-1">Demi-journée :</p>
                    <p>Jusqu'à {quoteData.maxPeopleHalfDay} personnes</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded">
                    <p className="font-medium mb-1">Tarif dégressif :</p>
                    <p>À partir de {quoteData.maxPeopleRegularRate + 1} personnes</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Configuration du Devis
              </CardTitle>
              <CardDescription>
                Saisissez le nombre de personnes pour générer le devis
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
                  {quoteData.numberOfPeople > quoteData.maxPeopleHalfDay ? `Plus de ${quoteData.maxPeopleHalfDay} personnes : journée complète recommandée` : `Jusqu'à ${quoteData.maxPeopleHalfDay} personnes : demi-journée suffisante`}
                </p>
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
            <CardContent className="space-y-6 pt-6">

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
                  {quoteData.numberOfPeople <= quoteData.maxPeopleRegularRate ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">
                        {quoteData.numberOfPeople} personnes × {quoteData.postProdRateUnder10}€ HT
                      </span>
                      <span className="font-medium">{quote.postProdCost}€ HT</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span>{quoteData.maxPeopleRegularRate} premières personnes × {quoteData.postProdRateUnder10}€ HT</span>
                        <span>{quoteData.maxPeopleRegularRate * quoteData.postProdRateUnder10}€ HT</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span>{quoteData.numberOfPeople - quoteData.maxPeopleRegularRate} personnes supplémentaires × {quoteData.postProdRateOver10}€ HT</span>
                        <span>{(quoteData.numberOfPeople - quoteData.maxPeopleRegularRate) * quoteData.postProdRateOver10}€ HT</span>
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

                {/* Total */}
                <div className="flex justify-between items-center text-xl font-bold text-green-800 bg-green-50 border border-green-200 p-4 rounded-lg">
                  <span>Total HT</span>
                  <span>{quote.total.toFixed(2)}€</span>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  Non assujetti à la TVA
                </p>

              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}