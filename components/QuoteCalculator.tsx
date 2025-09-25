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
  Settings,
  MapPin,
  Plus,
  Minus,
  X,
  Zap,
  Copy,
  BarChart3
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
  // Travel
  travelZone: 'local' | 'near' | 'far' | 'very_far';
  // Additional options
  additionalOptions: AdditionalOption[];
}

interface AdditionalOption {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isPredefined: boolean;
}

interface TravelZone {
  id: 'local' | 'near' | 'far' | 'very_far';
  name: string;
  description: string;
  price: number;
}

interface QuoteComparison {
  id: string;
  name: string;
  data: QuoteData;
}

export function QuoteCalculator() {
  // Travel zones configuration
  const travelZones: TravelZone[] = [
    { id: 'local', name: 'Local', description: '0-20 km', price: 0 },
    { id: 'near', name: 'Proche', description: '20-50 km', price: 30 },
    { id: 'far', name: 'Éloigné', description: '50-100 km', price: 60 },
    { id: 'very_far', name: 'Très éloigné', description: '100+ km', price: 120 }
  ];

  // Predefined equipment options
  const predefinedOptions = [
    { name: 'Fond photo professionnel', price: 50 },
    { name: 'Flash additionnel', price: 30 },
    { name: 'Réflecteur 5-en-1', price: 20 },
    { name: 'Trépied professionnel', price: 25 },
    { name: 'Objectif 85mm portrait', price: 40 },
    { name: 'Diffuseur softbox', price: 35 },
    { name: 'Drone (prise aérienne)', price: 150 },
    { name: 'Éclairage continu LED', price: 60 }
  ];

  const [quoteData, setQuoteData] = useState<QuoteData>({
    halfDayRate: 500,
    fullDayRate: 800,
    postProdRateUnder10: 50,
    postProdRateOver10: 40,
    numberOfPeople: 10,
    // Settings
    maxPeopleHalfDay: 10,
    maxPeopleRegularRate: 10,
    // Travel
    travelZone: 'local',
    // Additional options
    additionalOptions: []
  });

  const [isEditingRates, setIsEditingRates] = useState(false);
  const [showQuickCalc, setShowQuickCalc] = useState(false);
  const [quickPeople, setQuickPeople] = useState(10);
  const [comparisons, setComparisons] = useState<QuoteComparison[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState('');

  // Calculate quote based on number of people
  const calculateQuote = (data = quoteData) => {
    const { numberOfPeople, halfDayRate, fullDayRate, postProdRateUnder10, postProdRateOver10, maxPeopleHalfDay, maxPeopleRegularRate, travelZone, additionalOptions } = data;

    // Calculate shooting cost - use configurable threshold with mixed full/half days
    let shootingCost = 0;
    let shootingDescription = '';

    if (numberOfPeople <= maxPeopleHalfDay) {
      // Simple case: 1 half day
      shootingCost = halfDayRate;
      shootingDescription = '1 demi-journée';
    } else {
      // Calculate how many full days we can use
      const fullDays = Math.floor(numberOfPeople / (maxPeopleHalfDay * 2)); // Each full day = 2 * maxPeopleHalfDay
      const remainingPeople = numberOfPeople - (fullDays * maxPeopleHalfDay * 2);

      // For remaining people, determine if we need a full day or half days
      let additionalFullDays = 0;
      let halfDays = 0;

      if (remainingPeople > 0) {
        if (remainingPeople <= maxPeopleHalfDay) {
          // Remaining people fit in 1 half day
          halfDays = 1;
        } else {
          // Remaining people need 1 full day + potentially 1 half day
          additionalFullDays = 1;
          const remainingAfterFullDay = remainingPeople - (maxPeopleHalfDay * 2);
          if (remainingAfterFullDay > 0) {
            halfDays = 1;
          }
        }
      }

      const totalFullDays = fullDays + additionalFullDays;
      shootingCost = (totalFullDays * fullDayRate) + (halfDays * halfDayRate);

      // Create description
      const parts = [];
      if (totalFullDays > 0) {
        parts.push(`${totalFullDays} journée${totalFullDays > 1 ? 's' : ''} complète${totalFullDays > 1 ? 's' : ''}`);
      }
      if (halfDays > 0) {
        parts.push(`${halfDays} demi-journée`);
      }
      shootingDescription = parts.join(' + ');
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

    // Calculate travel cost
    const selectedTravelZone = travelZones.find(zone => zone.id === travelZone);
    const travelCost = selectedTravelZone ? selectedTravelZone.price : 0;

    // Calculate additional options cost
    const additionalOptionsCost = additionalOptions.reduce((sum, option) => {
      return sum + (option.price * option.quantity);
    }, 0);

    const subtotal = shootingCost + postProdCost + travelCost + additionalOptionsCost;

    return {
      shootingCost,
      shootingDescription,
      postProdCost,
      travelCost,
      travelDescription: selectedTravelZone ? `${selectedTravelZone.name} (${selectedTravelZone.description})` : 'Local',
      additionalOptionsCost,
      subtotal,
      total: subtotal
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

  // Quick calculator functions
  const calculateQuickQuote = () => {
    const quickData: QuoteData = {
      ...quoteData,
      numberOfPeople: quickPeople
    };
    return calculateQuote(quickData);
  };

  // Additional options functions
  const addPredefinedOption = (optionName: string, optionPrice: number) => {
    const newOption: AdditionalOption = {
      id: Date.now().toString(),
      name: optionName,
      price: optionPrice,
      quantity: 1,
      isPredefined: true
    };
    setQuoteData(prev => ({
      ...prev,
      additionalOptions: [...prev.additionalOptions, newOption]
    }));
  };

  const addCustomOption = () => {
    if (!newOptionName.trim() || !newOptionPrice.trim()) return;

    const newOption: AdditionalOption = {
      id: Date.now().toString(),
      name: newOptionName.trim(),
      price: parseFloat(newOptionPrice) || 0,
      quantity: 1,
      isPredefined: false
    };

    setQuoteData(prev => ({
      ...prev,
      additionalOptions: [...prev.additionalOptions, newOption]
    }));

    setNewOptionName('');
    setNewOptionPrice('');
  };

  const updateOptionQuantity = (optionId: string, quantity: number) => {
    setQuoteData(prev => ({
      ...prev,
      additionalOptions: prev.additionalOptions.map(option =>
        option.id === optionId ? { ...option, quantity: Math.max(0, quantity) } : option
      )
    }));
  };

  const removeOption = (optionId: string) => {
    setQuoteData(prev => ({
      ...prev,
      additionalOptions: prev.additionalOptions.filter(option => option.id !== optionId)
    }));
  };

  // Comparison functions
  const addToComparison = () => {
    const newComparison: QuoteComparison = {
      id: Date.now().toString(),
      name: `Devis ${comparisons.length + 1}`,
      data: { ...quoteData }
    };
    setComparisons(prev => [...prev, newComparison]);
  };

  const removeFromComparison = (comparisonId: string) => {
    setComparisons(prev => prev.filter(comp => comp.id !== comparisonId));
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
                  Génération automatique de devis photo avec options avancées
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQuickCalc(!showQuickCalc)}
              >
                <Zap className="h-4 w-4 mr-2" />
                Calcul rapide
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
                className={showComparison ? 'bg-blue-50' : ''}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Comparaison
                {comparisons.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{comparisons.length}</Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Calculator Widget */}
      {showQuickCalc && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4 justify-center">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600" />
                <Label className="font-medium">Calcul rapide:</Label>
              </div>
              <Input
                type="number"
                min="1"
                value={quickPeople}
                onChange={(e) => setQuickPeople(parseInt(e.target.value) || 1)}
                className="w-20"
                placeholder="10"
              />
              <span className="text-sm text-muted-foreground">personnes</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-amber-700">
                  {calculateQuickQuote().total.toFixed(2)}€ HT
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQuoteData(prev => ({ ...prev, numberOfPeople: quickPeople }));
                    setShowQuickCalc(false);
                  }}
                >
                  Utiliser
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Configuration de Base
              </CardTitle>
              <CardDescription>
                Paramètres principaux du devis
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

              {/* Travel Zone */}
              <div className="space-y-2">
                <Label className="text-base font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Zone de déplacement
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {travelZones.map((zone) => (
                    <Button
                      key={zone.id}
                      variant={quoteData.travelZone === zone.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setQuoteData(prev => ({ ...prev, travelZone: zone.id }))}
                      className="h-auto p-3 flex flex-col items-start"
                    >
                      <div className="font-medium">{zone.name}</div>
                      <div className="text-xs opacity-70">{zone.description}</div>
                      <div className="text-xs font-bold">{zone.price === 0 ? 'Gratuit' : `${zone.price}€`}</div>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Options Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Options Supplémentaires
              </CardTitle>
              <CardDescription>
                Matériel et services additionnels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Current Options */}
              {quoteData.additionalOptions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Options ajoutées :</h4>
                  {quoteData.additionalOptions.map((option) => (
                    <div key={option.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{option.name}</div>
                        <div className="text-xs text-muted-foreground">{option.price}€ × {option.quantity}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateOptionQuantity(option.id, option.quantity - 1)}
                          className="h-6 w-6 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-8 text-center">{option.quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateOptionQuantity(option.id, option.quantity + 1)}
                          className="h-6 w-6 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(option.id)}
                          className="h-6 w-6 p-0 text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Predefined Options */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Matériel disponible :</h4>
                <div className="grid grid-cols-1 gap-2">
                  {predefinedOptions.map((option) => (
                    <Button
                      key={option.name}
                      variant="outline"
                      size="sm"
                      onClick={() => addPredefinedOption(option.name, option.price)}
                      className="h-auto p-2 flex justify-between"
                      disabled={quoteData.additionalOptions.some(added => added.name === option.name)}
                    >
                      <span className="text-xs">{option.name}</span>
                      <span className="text-xs font-bold">{option.price}€</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Option */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Option personnalisée :</h4>
                <Input
                  placeholder="Nom de l'option"
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Prix €"
                    value={newOptionPrice}
                    onChange={(e) => setNewOptionPrice(e.target.value)}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={addCustomOption}
                    disabled={!newOptionName.trim() || !newOptionPrice.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quote Display */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-green-600" />
                    Devis Calculé
                  </CardTitle>
                  <CardDescription>
                    Calcul pour {quoteData.numberOfPeople} personne{quoteData.numberOfPeople > 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addToComparison}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Comparer
                </Button>
              </div>
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

                {/* Travel Cost */}
                {quote.travelCost > 0 && (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Frais de déplacement
                    </h3>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">
                        {quote.travelDescription}
                      </span>
                      <span className="font-medium">{quote.travelCost}€ HT</span>
                    </div>
                  </div>
                )}

                {/* Additional Options */}
                {quote.additionalOptionsCost > 0 && (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Options supplémentaires
                    </h3>
                    <div className="space-y-1">
                      {quoteData.additionalOptions.map((option) => (
                        <div key={option.id} className="flex justify-between items-center text-sm">
                          <span>{option.name} {option.quantity > 1 ? `× ${option.quantity}` : ''}</span>
                          <span>{option.price * option.quantity}€ HT</span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total options</span>
                        <span className="font-medium">{quote.additionalOptionsCost}€ HT</span>
                      </div>
                    </div>
                  </div>
                )}

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

        {/* Comparison Section */}
        {showComparison && comparisons.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Comparaison des Devis
              </CardTitle>
              <CardDescription>
                Comparez différents scénarios côte à côte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Current Quote */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-blue-900">Devis Actuel</h3>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                      En cours
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Personnes :</span>
                      <span className="font-medium">{quoteData.numberOfPeople}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shooting :</span>
                      <span className="font-medium">{quote.shootingCost}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Post-prod :</span>
                      <span className="font-medium">{quote.postProdCost}€</span>
                    </div>
                    {quote.travelCost > 0 && (
                      <div className="flex justify-between">
                        <span>Déplacement :</span>
                        <span className="font-medium">{quote.travelCost}€</span>
                      </div>
                    )}
                    {quote.additionalOptionsCost > 0 && (
                      <div className="flex justify-between">
                        <span>Options :</span>
                        <span className="font-medium">{quote.additionalOptionsCost}€</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-blue-900">
                      <span>Total :</span>
                      <span>{quote.total.toFixed(2)}€</span>
                    </div>
                  </div>
                </div>

                {/* Saved Comparisons */}
                {comparisons.slice(0, 2).map((comparison) => {
                  const comparisonQuote = calculateQuote(comparison.data);
                  return (
                    <div key={comparison.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">{comparison.name}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromComparison(comparison.id)}
                          className="h-6 w-6 p-0 text-gray-500"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Personnes :</span>
                          <span className="font-medium">{comparison.data.numberOfPeople}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Shooting :</span>
                          <span className="font-medium">{comparisonQuote.shootingCost}€</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Post-prod :</span>
                          <span className="font-medium">{comparisonQuote.postProdCost}€</span>
                        </div>
                        {comparisonQuote.travelCost > 0 && (
                          <div className="flex justify-between">
                            <span>Déplacement :</span>
                            <span className="font-medium">{comparisonQuote.travelCost}€</span>
                          </div>
                        )}
                        {comparisonQuote.additionalOptionsCost > 0 && (
                          <div className="flex justify-between">
                            <span>Options :</span>
                            <span className="font-medium">{comparisonQuote.additionalOptionsCost}€</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Total :</span>
                          <span className={comparisonQuote.total < quote.total ? 'text-green-700' : comparisonQuote.total > quote.total ? 'text-red-700' : ''}>
                            {comparisonQuote.total.toFixed(2)}€
                          </span>
                        </div>
                        {comparisonQuote.total !== quote.total && (
                          <div className="text-xs text-center mt-2">
                            <span className={comparisonQuote.total < quote.total ? 'text-green-700' : 'text-red-700'}>
                              {comparisonQuote.total < quote.total ? '-' : '+'}{Math.abs(comparisonQuote.total - quote.total).toFixed(2)}€
                              ({((Math.abs(comparisonQuote.total - quote.total) / quote.total) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {comparisons.length > 2 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {comparisons.length - 2} autre{comparisons.length > 3 ? 's' : ''} comparaison{comparisons.length > 3 ? 's' : ''} disponible{comparisons.length > 3 ? 's' : ''}
                  </p>
                </div>
              )}

              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setComparisons([])}
                  className="text-gray-600"
                >
                  Vider la comparaison
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}