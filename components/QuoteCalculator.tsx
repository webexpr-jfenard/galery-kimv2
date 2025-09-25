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
      // Compare full day vs multiple half days
      const halfDaySessions = Math.ceil(numberOfPeople / maxPeopleHalfDay);
      const multipleHalfDaysCost = halfDaySessions * halfDayRate;

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
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={quoteData.halfDayRate}
                        onChange={(e) => handleRateChange('halfDayRate', e.target.value)}
                        disabled={!isEditingRates}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground">€ HT</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Journée complète</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={quoteData.fullDayRate}
                        onChange={(e) => handleRateChange('fullDayRate', e.target.value)}
                        disabled={!isEditingRates}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground">€ HT</span>
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
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={quoteData.postProdRateUnder10}
                        onChange={(e) => handleRateChange('postProdRateUnder10', e.target.value)}
                        disabled={!isEditingRates}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground">€/pers</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Tarif dégressif</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={quoteData.postProdRateOver10}
                        onChange={(e) => handleRateChange('postProdRateOver10', e.target.value)}
                        disabled={!isEditingRates}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground">€/pers</span>
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
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={quoteData.maxPeopleHalfDay}
                        onChange={(e) => handleRateChange('maxPeopleHalfDay', e.target.value)}
                        disabled={!isEditingRates}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground">pers</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Seuil tarif normal</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={quoteData.maxPeopleRegularRate}
                        onChange={(e) => handleRateChange('maxPeopleRegularRate', e.target.value)}
                        disabled={!isEditingRates}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground">pers</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

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
          <Card className="bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-200">
            <CardHeader className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Devis Calculé
              </CardTitle>
              <CardDescription className="text-emerald-100">
                Calcul automatique basé sur {quoteData.numberOfPeople} personne{quoteData.numberOfPeople > 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">

              {/* Quote Details */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-800">
                    <Clock className="h-4 w-4" />
                    Prestation Shooting
                  </h3>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700">
                      {quote.shootingDescription}
                    </span>
                    <span className="font-bold text-blue-800 bg-blue-200 px-2 py-1 rounded">{quote.shootingCost}€ HT</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Installation + prises de vue
                  </p>
                </div>

                <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-lg border border-purple-200">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-purple-800">
                    <Edit className="h-4 w-4" />
                    Post-production
                  </h3>
                  {quoteData.numberOfPeople <= quoteData.maxPeopleRegularRate ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-purple-700">
                        {quoteData.numberOfPeople} personnes × {quoteData.postProdRateUnder10}€ HT
                      </span>
                      <span className="font-bold text-purple-800 bg-purple-200 px-2 py-1 rounded">{quote.postProdCost}€ HT</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-purple-700">{quoteData.maxPeopleRegularRate} premières personnes × {quoteData.postProdRateUnder10}€ HT</span>
                        <span className="text-purple-800">{quoteData.maxPeopleRegularRate * quoteData.postProdRateUnder10}€ HT</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-purple-700">{quoteData.numberOfPeople - quoteData.maxPeopleRegularRate} personnes supplémentaires × {quoteData.postProdRateOver10}€ HT</span>
                        <span className="text-purple-800">{(quoteData.numberOfPeople - quoteData.maxPeopleRegularRate) * quoteData.postProdRateOver10}€ HT</span>
                      </div>
                      <Separator className="bg-purple-200" />
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-purple-800">Total Post-production</span>
                        <span className="font-bold text-purple-800 bg-purple-200 px-2 py-1 rounded">{quote.postProdCost}€ HT</span>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-purple-600 mt-1">
                    Retouche professionnelle (lumière, contraste, peau, détails)
                  </p>
                </div>

                <Separator />

                {/* Total */}
                <div className="flex justify-between items-center text-2xl font-bold text-white bg-gradient-to-r from-emerald-500 to-green-500 p-4 rounded-lg shadow-lg">
                  <span>Total HT</span>
                  <span className="bg-white/20 px-3 py-1 rounded backdrop-blur">{quote.total.toFixed(2)}€</span>
                </div>

                <div className="text-center">
                  <p className="text-sm text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full inline-block font-medium">
                    💼 Non assujetti à la TVA
                  </p>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}