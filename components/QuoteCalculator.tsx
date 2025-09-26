import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
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
  BarChart3,
  Building2,
  Heart,
  Newspaper
} from "lucide-react";

type CalculatorType = 'corporate' | 'wedding' | 'reportage';

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
  data: any;
}

export function QuoteCalculator() {
  // Travel zones configuration
  const travelZones: TravelZone[] = [
    { id: 'local', name: 'Local', description: '0-20 km', price: 0 },
    { id: 'near', name: 'Proche', description: '20-50 km', price: 30 },
    { id: 'far', name: 'Éloigné', description: '50-100 km', price: 60 },
    { id: 'very_far', name: 'Très éloigné', description: '100+ km', price: 120 }
  ];

  // Calculator type state
  const [calculatorType, setCalculatorType] = useState<CalculatorType>('corporate');

  // Corporate calculator state
  const [corporateData, setCorporateData] = useState({
    halfDayRate: 500,
    fullDayRate: 800,
    postProdRateUnder10: 50,
    postProdRateOver10: 40,
    numberOfPeople: 10,
    maxPeopleHalfDay: 10,
    maxPeopleRegularRate: 10,
    travelZone: 'local' as 'local' | 'near' | 'far' | 'very_far',
    additionalOptions: [] as AdditionalOption[]
  });

  // Wedding calculator state
  const [weddingData, setWeddingData] = useState({
    ceremonyRate: 800,
    fullDayRate: 1500,
    extraHourRate: 100,
    selectedPackage: 'ceremony' as 'ceremony' | 'fullday' | 'custom',
    extraHours: 0,
    retouchingRate: 15,
    numberOfPhotosToRetouch: 50,
    travelZone: 'local' as 'local' | 'near' | 'far' | 'very_far',
    additionalOptions: [] as AdditionalOption[]
  });

  // Reportage calculator state
  const [reportageData, setReportageData] = useState({
    halfDayRate: 400,
    fullDayRate: 700,
    selectedDuration: 'halfday' as 'halfday' | 'fullday',
    numberOfPhotos: 100,
    postProdRatePerPhoto: 2,
    travelZone: 'local' as 'local' | 'near' | 'far' | 'very_far',
    additionalOptions: [] as AdditionalOption[]
  });

  const [isEditingRates, setIsEditingRates] = useState(false);
  const [showQuickCalc, setShowQuickCalc] = useState(false);
  const [quickPeople, setQuickPeople] = useState(10);
  const [comparisons, setComparisons] = useState<QuoteComparison[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState('');
  const [departureAddress, setDepartureAddress] = useState('');
  const [arrivalAddress, setArrivalAddress] = useState('');
  const [calculatingDistance, setCalculatingDistance] = useState(false);

  // Autocomplete suggestions for addresses
  const [departureResults, setDepartureResults] = useState<string[]>([]);
  const [arrivalResults, setArrivalResults] = useState<string[]>([]);
  const [showDepartureSuggestions, setShowDepartureSuggestions] = useState(false);
  const [showArrivalSuggestions, setShowArrivalSuggestions] = useState(false);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDepartureSuggestions(false);
      setShowArrivalSuggestions(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Get current data based on calculator type
  const getCurrentData = () => {
    switch (calculatorType) {
      case 'corporate': return corporateData;
      case 'wedding': return weddingData;
      case 'reportage': return reportageData;
    }
  };

  const getCurrentSetter = () => {
    switch (calculatorType) {
      case 'corporate': return setCorporateData;
      case 'wedding': return setWeddingData;
      case 'reportage': return setReportageData;
    }
  };

  const currentData = getCurrentData();
  const setCurrentData = getCurrentSetter();

  // Calculate quote based on calculator type
  const calculateQuote = (data = currentData) => {
    const { travelZone, additionalOptions } = data;

    // Calculate travel cost
    const selectedTravelZone = travelZones.find(zone => zone.id === travelZone);
    const travelCost = selectedTravelZone ? selectedTravelZone.price : 0;

    // Calculate additional options cost
    const additionalOptionsCost = additionalOptions.reduce((sum: number, option: AdditionalOption) => {
      return sum + (option.price * option.quantity);
    }, 0);

    let mainCost = 0;
    let mainDescription = '';
    let postProdCost = 0;
    let postProdDescription = '';

    // Determine the type of data being calculated
    const dataType = (data as any).type || calculatorType;

    switch (dataType) {
      case 'corporate': {
        const corpData = data as typeof corporateData;
        const { numberOfPeople, halfDayRate, fullDayRate, postProdRateUnder10, postProdRateOver10, maxPeopleHalfDay, maxPeopleRegularRate } = corpData;

        // Corporate shooting calculation
        if (numberOfPeople <= maxPeopleHalfDay) {
          mainCost = halfDayRate;
          mainDescription = '1 demi-journée';
        } else {
          const fullDays = Math.floor(numberOfPeople / (maxPeopleHalfDay * 2));
          const remainingPeople = numberOfPeople - (fullDays * maxPeopleHalfDay * 2);

          let additionalFullDays = 0;
          let halfDays = 0;

          if (remainingPeople > 0) {
            if (remainingPeople <= maxPeopleHalfDay) {
              halfDays = 1;
            } else {
              additionalFullDays = 1;
              const remainingAfterFullDay = remainingPeople - (maxPeopleHalfDay * 2);
              if (remainingAfterFullDay > 0) {
                halfDays = 1;
              }
            }
          }

          const totalFullDays = fullDays + additionalFullDays;
          mainCost = (totalFullDays * fullDayRate) + (halfDays * halfDayRate);

          const parts = [];
          if (totalFullDays > 0) {
            parts.push(`${totalFullDays} journée${totalFullDays > 1 ? 's' : ''} complète${totalFullDays > 1 ? 's' : ''}`);
          }
          if (halfDays > 0) {
            parts.push(`${halfDays} demi-journée`);
          }
          mainDescription = parts.join(' + ');
        }

        // Corporate post-production
        if (numberOfPeople <= maxPeopleRegularRate) {
          postProdCost = numberOfPeople * postProdRateUnder10;
          postProdDescription = `${numberOfPeople} personnes × ${postProdRateUnder10}€`;
        } else {
          postProdCost = maxPeopleRegularRate * postProdRateUnder10;
          const additionalPeople = numberOfPeople - maxPeopleRegularRate;
          postProdCost += additionalPeople * postProdRateOver10;
          postProdDescription = `${maxPeopleRegularRate} premières × ${postProdRateUnder10}€ + ${additionalPeople} suivantes × ${postProdRateOver10}€`;
        }
        break;
      }

      case 'wedding': {
        const weddingDataTyped = data as typeof weddingData;
        const { ceremonyRate, fullDayRate, extraHourRate, selectedPackage, extraHours, retouchingRate, numberOfPhotosToRetouch } = weddingDataTyped;

        // Wedding package calculation
        switch (selectedPackage) {
          case 'ceremony':
            mainCost = ceremonyRate;
            mainDescription = 'Forfait Cérémonie';
            break;
          case 'fullday':
            mainCost = fullDayRate;
            mainDescription = 'Forfait Journée Complète';
            break;
          case 'custom':
            mainCost = ceremonyRate + (extraHours * extraHourRate);
            mainDescription = `Forfait Cérémonie + ${extraHours}h supplémentaires`;
            break;
        }

        // Wedding retouching
        postProdCost = numberOfPhotosToRetouch * retouchingRate;
        postProdDescription = `${numberOfPhotosToRetouch} photos × ${retouchingRate}€`;
        break;
      }

      case 'reportage': {
        const reportageDataTyped = data as typeof reportageData;
        const { halfDayRate, fullDayRate, selectedDuration, numberOfPhotos, postProdRatePerPhoto } = reportageDataTyped;

        // Reportage duration calculation
        if (selectedDuration === 'halfday') {
          mainCost = halfDayRate;
          mainDescription = 'Forfait Demi-journée';
        } else {
          mainCost = fullDayRate;
          mainDescription = 'Forfait Journée complète';
        }

        // Reportage post-production
        postProdCost = numberOfPhotos * postProdRatePerPhoto;
        postProdDescription = `${numberOfPhotos} photos × ${postProdRatePerPhoto}€`;
        break;
      }
    }

    const subtotal = mainCost + postProdCost + travelCost + additionalOptionsCost;

    return {
      mainCost,
      mainDescription,
      postProdCost,
      postProdDescription,
      travelCost,
      travelDescription: selectedTravelZone ? `${selectedTravelZone.name} (${selectedTravelZone.description})` : 'Local',
      additionalOptionsCost,
      subtotal,
      total: subtotal
    };
  };

  const quote = calculateQuote();

  // Generic handlers
  const handleFieldChange = (field: string, value: string | number) => {
    setCurrentData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: string, value: string) => {
    const num = parseFloat(value) || 0;
    setCurrentData((prev: any) => ({ ...prev, [field]: Math.max(0, num) }));
  };

  // Quick calculator functions (for corporate only)
  const calculateQuickQuote = () => {
    if (calculatorType === 'corporate') {
      const quickData = {
        ...corporateData,
        numberOfPeople: quickPeople
      };
      return calculateQuote(quickData);
    }
    return calculateQuote();
  };

  // Search address suggestions using Nominatim (OpenStreetMap - no CORS, free)
  const searchAddresses = async (query: string): Promise<string[]> => {
    if (query.length < 3) return [];

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}&countrycodes=fr`
      );
      const results = await response.json();

      return results.map((result: any) => result.display_name);
    } catch (error) {
      console.error('Address search error:', error);
      return [];
    }
  };

  // Calculate distance using Nominatim + distance formula
  const calculateDistanceAndCost = async () => {
    if (!departureAddress.trim() || !arrivalAddress.trim()) return;

    setCalculatingDistance(true);
    try {
      // Geocode both addresses
      const [depResponse, arrResponse] = await Promise.all([
        fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(departureAddress)}&countrycodes=fr`),
        fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(arrivalAddress)}&countrycodes=fr`)
      ]);

      const [depResults, arrResults] = await Promise.all([
        depResponse.json(),
        arrResponse.json()
      ]);

      if (depResults.length === 0 || arrResults.length === 0) {
        alert('Une ou plusieurs adresses non trouvées');
        return;
      }

      // Calculate distance using Haversine formula
      const lat1 = parseFloat(depResults[0].lat);
      const lon1 = parseFloat(depResults[0].lon);
      const lat2 = parseFloat(arrResults[0].lat);
      const lon2 = parseFloat(arrResults[0].lon);

      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      // Determine zone based on distance
      let newZone: 'local' | 'near' | 'far' | 'very_far' = 'local';
      if (distance > 100) newZone = 'very_far';
      else if (distance > 50) newZone = 'far';
      else if (distance > 20) newZone = 'near';

      handleFieldChange('travelZone', newZone);

      alert(`Distance calculée: ${distance.toFixed(1)} km\nZone sélectionnée: ${travelZones.find(z => z.id === newZone)?.name}`);

    } catch (error) {
      console.error('Distance calculation error:', error);
      alert('Erreur lors du calcul de distance');
    } finally {
      setCalculatingDistance(false);
    }
  };

  // Handle address input changes with autocomplete
  const handleDepartureChange = async (value: string) => {
    setDepartureAddress(value);
    if (value.length >= 3) {
      const results = await searchAddresses(value);
      setDepartureResults(results);
      setShowDepartureSuggestions(true);
    } else {
      setShowDepartureSuggestions(false);
    }
  };

  const handleArrivalChange = async (value: string) => {
    setArrivalAddress(value);
    if (value.length >= 3) {
      const results = await searchAddresses(value);
      setArrivalResults(results);
      setShowArrivalSuggestions(true);
    } else {
      setShowArrivalSuggestions(false);
    }
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

    setCurrentData((prev: any) => ({
      ...prev,
      additionalOptions: [...prev.additionalOptions, newOption]
    }));

    setNewOptionName('');
    setNewOptionPrice('');
  };

  const updateOptionQuantity = (optionId: string, quantity: number) => {
    setCurrentData((prev: any) => ({
      ...prev,
      additionalOptions: prev.additionalOptions.map((option: AdditionalOption) =>
        option.id === optionId ? { ...option, quantity: Math.max(0, quantity) } : option
      )
    }));
  };

  const removeOption = (optionId: string) => {
    setCurrentData((prev: any) => ({
      ...prev,
      additionalOptions: prev.additionalOptions.filter((option: AdditionalOption) => option.id !== optionId)
    }));
  };

  // Comparison functions
  const addToComparison = () => {
    const newComparison: QuoteComparison = {
      id: Date.now().toString(),
      name: `Devis ${comparisons.length + 1}`,
      data: { type: calculatorType, ...currentData }
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
                  {calculatorType === 'corporate' && 'Photos corporate - Tarification par personne'}
                  {calculatorType === 'wedding' && 'Photos de mariage - Forfaits et retouche'}
                  {calculatorType === 'reportage' && 'Reportage photo - Forfaits durée'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Calculator Type Selector */}
              <div className="flex items-center gap-2">
                <div className="flex gap-2 p-2 bg-background rounded-lg border">
                  <Button
                    variant={calculatorType === 'corporate' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCalculatorType('corporate')}
                    className="h-10 px-4 flex items-center gap-2"
                  >
                    <Building2 className="h-4 w-4" />
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-semibold">Corporate</span>
                      <span className="text-xs opacity-70">Entreprise</span>
                    </div>
                  </Button>
                  <Button
                    variant={calculatorType === 'wedding' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCalculatorType('wedding')}
                    className="h-10 px-4 flex items-center gap-2"
                  >
                    <Heart className="h-4 w-4" />
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-semibold">Mariage</span>
                      <span className="text-xs opacity-70">Cérémonie</span>
                    </div>
                  </Button>
                  <Button
                    variant={calculatorType === 'reportage' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCalculatorType('reportage')}
                    className="h-10 px-4 flex items-center gap-2"
                  >
                    <Newspaper className="h-4 w-4" />
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-semibold">Reportage</span>
                      <span className="text-xs opacity-70">Événement</span>
                    </div>
                  </Button>
                </div>
              </div>
              {showQuickCalc && calculatorType === 'corporate' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuickCalc(!showQuickCalc)}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Calcul rapide
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Calculator Widget */}
      {showQuickCalc && calculatorType === 'corporate' && (
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
                    handleFieldChange('numberOfPeople', quickPeople);
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
                  Tarifs Unitaires - {calculatorType === 'corporate' ? 'Corporate' : calculatorType === 'wedding' ? 'Mariage' : 'Reportage'}
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
            {/* Corporate Rates */}
            {calculatorType === 'corporate' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                          value={corporateData.halfDayRate}
                          onChange={(e) => handleNumberChange('halfDayRate', e.target.value)}
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
                          value={corporateData.fullDayRate}
                          onChange={(e) => handleNumberChange('fullDayRate', e.target.value)}
                          disabled={!isEditingRates}
                          className="pr-12"
                          placeholder="0.00"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">€ HT</span>
                      </div>
                    </div>
                  </div>
                </div>

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
                          value={corporateData.postProdRateUnder10}
                          onChange={(e) => handleNumberChange('postProdRateUnder10', e.target.value)}
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
                          value={corporateData.postProdRateOver10}
                          onChange={(e) => handleNumberChange('postProdRateOver10', e.target.value)}
                          disabled={!isEditingRates}
                          className="pr-16"
                          placeholder="0.00"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">€/pers</span>
                      </div>
                    </div>
                  </div>
                </div>

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
                          value={corporateData.maxPeopleHalfDay}
                          onChange={(e) => handleNumberChange('maxPeopleHalfDay', e.target.value)}
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
                          value={corporateData.maxPeopleRegularRate}
                          onChange={(e) => handleNumberChange('maxPeopleRegularRate', e.target.value)}
                          disabled={!isEditingRates}
                          className="pr-12"
                          placeholder="10"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">pers</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Informations
                  </h3>
                  <div className="space-y-3 text-xs text-muted-foreground">
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="font-medium mb-1">Demi-journée :</p>
                      <p>Jusqu'à {corporateData.maxPeopleHalfDay} personnes</p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="font-medium mb-1">Tarif dégressif :</p>
                      <p>À partir de {corporateData.maxPeopleRegularRate + 1} personnes</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Wedding Rates */}
            {calculatorType === 'wedding' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Forfaits
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Cérémonie</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          value={weddingData.ceremonyRate}
                          onChange={(e) => handleNumberChange('ceremonyRate', e.target.value)}
                          disabled={!isEditingRates}
                          className="pr-12"
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
                          value={weddingData.fullDayRate}
                          onChange={(e) => handleNumberChange('fullDayRate', e.target.value)}
                          disabled={!isEditingRates}
                          className="pr-12"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">€ HT</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Heure supplémentaire</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          value={weddingData.extraHourRate}
                          onChange={(e) => handleNumberChange('extraHourRate', e.target.value)}
                          disabled={!isEditingRates}
                          className="pr-12"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">€/h</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Retouche
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Tarif par photo</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          value={weddingData.retouchingRate}
                          onChange={(e) => handleNumberChange('retouchingRate', e.target.value)}
                          disabled={!isEditingRates}
                          className="pr-16"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">€/photo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reportage Rates */}
            {calculatorType === 'reportage' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Forfaits
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Demi-journée</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          value={reportageData.halfDayRate}
                          onChange={(e) => handleNumberChange('halfDayRate', e.target.value)}
                          disabled={!isEditingRates}
                          className="pr-12"
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
                          value={reportageData.fullDayRate}
                          onChange={(e) => handleNumberChange('fullDayRate', e.target.value)}
                          disabled={!isEditingRates}
                          className="pr-12"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">€ HT</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Post-production
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Tarif par photo</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          value={reportageData.postProdRatePerPhoto}
                          onChange={(e) => handleNumberChange('postProdRatePerPhoto', e.target.value)}
                          disabled={!isEditingRates}
                          className="pr-16"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">€/photo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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

              {/* Corporate Configuration */}
              {calculatorType === 'corporate' && (
                <div className="space-y-2">
                  <Label htmlFor="numberOfPeople" className="text-base font-medium">
                    Nombre de personnes *
                  </Label>
                  <Input
                    id="numberOfPeople"
                    type="number"
                    min="1"
                    value={corporateData.numberOfPeople}
                    onChange={(e) => handleNumberChange('numberOfPeople', e.target.value)}
                    className="text-lg"
                  />
                  <p className="text-sm text-muted-foreground">
                    {corporateData.numberOfPeople > corporateData.maxPeopleHalfDay ? `Plus de ${corporateData.maxPeopleHalfDay} personnes : journée complète recommandée` : `Jusqu'à ${corporateData.maxPeopleHalfDay} personnes : demi-journée suffisante`}
                  </p>
                </div>
              )}

              {/* Wedding Configuration */}
              {calculatorType === 'wedding' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Forfait sélectionné *</Label>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        variant={weddingData.selectedPackage === 'ceremony' ? 'default' : 'outline'}
                        onClick={() => handleFieldChange('selectedPackage', 'ceremony')}
                        className="justify-start"
                      >
                        Cérémonie ({weddingData.ceremonyRate}€)
                      </Button>
                      <Button
                        variant={weddingData.selectedPackage === 'fullday' ? 'default' : 'outline'}
                        onClick={() => handleFieldChange('selectedPackage', 'fullday')}
                        className="justify-start"
                      >
                        Journée complète ({weddingData.fullDayRate}€)
                      </Button>
                      <Button
                        variant={weddingData.selectedPackage === 'custom' ? 'default' : 'outline'}
                        onClick={() => handleFieldChange('selectedPackage', 'custom')}
                        className="justify-start"
                      >
                        Personnalisé (Cérémonie + Extra)
                      </Button>
                    </div>
                  </div>

                  {weddingData.selectedPackage === 'custom' && (
                    <div className="space-y-2">
                      <Label className="text-base font-medium">Heures supplémentaires</Label>
                      <Input
                        type="number"
                        min="0"
                        value={weddingData.extraHours}
                        onChange={(e) => handleNumberChange('extraHours', e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-base font-medium">Nombre de photos à retoucher</Label>
                    <Input
                      type="number"
                      min="0"
                      value={weddingData.numberOfPhotosToRetouch}
                      onChange={(e) => handleNumberChange('numberOfPhotosToRetouch', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Reportage Configuration */}
              {calculatorType === 'reportage' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Durée du reportage *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={reportageData.selectedDuration === 'halfday' ? 'default' : 'outline'}
                        onClick={() => handleFieldChange('selectedDuration', 'halfday')}
                      >
                        Demi-journée
                      </Button>
                      <Button
                        variant={reportageData.selectedDuration === 'fullday' ? 'default' : 'outline'}
                        onClick={() => handleFieldChange('selectedDuration', 'fullday')}
                      >
                        Journée complète
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-medium">Nombre de photos estimé</Label>
                    <Input
                      type="number"
                      min="1"
                      value={reportageData.numberOfPhotos}
                      onChange={(e) => handleNumberChange('numberOfPhotos', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Travel Zone */}
              <div className="space-y-2">
                <Label className="text-base font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Zone de déplacement
                </Label>
                {/* Address-based calculation */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2">
                    {/* Departure Address with Autocomplete */}
                    <div className="relative">
                      <Input
                        placeholder="Adresse de départ"
                        value={departureAddress}
                        onChange={(e) => handleDepartureChange(e.target.value)}
                        onFocus={() => departureResults.length > 0 && setShowDepartureSuggestions(true)}
                        className="text-sm"
                      />
                      {showDepartureSuggestions && departureResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {departureResults.map((address, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                              onClick={() => {
                                setDepartureAddress(address);
                                setShowDepartureSuggestions(false);
                              }}
                            >
                              {address}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Arrival Address with Autocomplete */}
                    <div className="relative">
                      <Input
                        placeholder="Adresse d'arrivée"
                        value={arrivalAddress}
                        onChange={(e) => handleArrivalChange(e.target.value)}
                        onFocus={() => arrivalResults.length > 0 && setShowArrivalSuggestions(true)}
                        className="text-sm"
                      />
                      {showArrivalSuggestions && arrivalResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {arrivalResults.map((address, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                              onClick={() => {
                                setArrivalAddress(address);
                                setShowArrivalSuggestions(false);
                              }}
                            >
                              {address}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={calculateDistanceAndCost}
                      disabled={calculatingDistance || !departureAddress.trim() || !arrivalAddress.trim()}
                      className="w-full"
                    >
                      {calculatingDistance ? 'Calcul...' : 'Calculer distance'}
                    </Button>
                  </div>

                  <div className="text-center text-sm text-muted-foreground">ou</div>

                  <div className="grid grid-cols-2 gap-2">
                    {travelZones.map((zone) => (
                      <Button
                        key={zone.id}
                        variant={currentData.travelZone === zone.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleFieldChange('travelZone', zone.id)}
                        className="h-auto p-3 flex flex-col items-start"
                      >
                        <div className="font-medium">{zone.name}</div>
                        <div className="text-xs opacity-70">{zone.description}</div>
                        <div className="text-xs font-bold">{zone.price === 0 ? 'Gratuit' : `${zone.price}€`}</div>
                      </Button>
                    ))}
                  </div>
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
              {currentData.additionalOptions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Options ajoutées :</h4>
                  {currentData.additionalOptions.map((option: AdditionalOption) => (
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
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5 text-green-600" />
                  Devis Calculé
                </CardTitle>
                <CardDescription>
                  {calculatorType === 'corporate' && `Calcul pour ${corporateData.numberOfPeople} personne${corporateData.numberOfPeople > 1 ? 's' : ''}`}
                  {calculatorType === 'wedding' && `Forfait ${weddingData.selectedPackage}`}
                  {calculatorType === 'reportage' && `${reportageData.selectedDuration === 'halfday' ? 'Demi-journée' : 'Journée complète'}`}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">

              {/* Quote Details */}
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {calculatorType === 'corporate' ? 'Prestation Shooting' : calculatorType === 'wedding' ? 'Forfait Mariage' : 'Forfait Reportage'}
                  </h3>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">
                      {quote.mainDescription}
                    </span>
                    <span className="font-medium">{quote.mainCost}€ HT</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {calculatorType === 'corporate' ? 'Installation + prises de vue' : calculatorType === 'wedding' ? 'Prestation photo mariage' : 'Prestation reportage'}
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    {calculatorType === 'wedding' ? 'Retouche' : 'Post-production'}
                  </h3>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">
                      {quote.postProdDescription}
                    </span>
                    <span className="font-medium">{quote.postProdCost}€ HT</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {calculatorType === 'wedding' ? 'Retouche professionnelle des photos sélectionnées' : 'Retouche professionnelle (lumière, contraste, peau, détails)'}
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
                      {currentData.additionalOptions.map((option: AdditionalOption) => (
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

                {/* Comparison buttons */}
                <div className="flex justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addToComparison}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter à la comparaison
                  </Button>
                  {comparisons.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowComparison(true)}
                      className="flex items-center gap-2"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Voir comparaisons ({comparisons.length})
                    </Button>
                  )}
                </div>

              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Dialog */}
        <Dialog open={showComparison && comparisons.length > 0} onOpenChange={setShowComparison}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Comparaison des Devis
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
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
                    <span>Type :</span>
                    <span className="font-medium capitalize">{calculatorType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Principal :</span>
                    <span className="font-medium">{quote.mainCost}€</span>
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
                // Calculate quote for saved comparison
                const savedType = comparison.data.type || 'corporate';
                const previousCalcType = calculatorType;

                // Temporarily set the calculator type to match the saved data
                const tempQuote = (() => {
                  switch (savedType) {
                    case 'corporate':
                      return calculateQuote(comparison.data);
                    case 'wedding':
                      return calculateQuote(comparison.data);
                    case 'reportage':
                      return calculateQuote(comparison.data);
                    default:
                      return calculateQuote(comparison.data);
                  }
                })();

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
                        <span>Type :</span>
                        <span className="font-medium capitalize">{savedType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Principal :</span>
                        <span className="font-medium">{tempQuote.mainCost}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Post-prod :</span>
                        <span className="font-medium">{tempQuote.postProdCost}€</span>
                      </div>
                      {tempQuote.travelCost > 0 && (
                        <div className="flex justify-between">
                          <span>Déplacement :</span>
                          <span className="font-medium">{tempQuote.travelCost}€</span>
                        </div>
                      )}
                      {tempQuote.additionalOptionsCost > 0 && (
                        <div className="flex justify-between">
                          <span>Options :</span>
                          <span className="font-medium">{tempQuote.additionalOptionsCost}€</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Total :</span>
                        <span className={tempQuote.total < quote.total ? 'text-green-700' : tempQuote.total > quote.total ? 'text-red-700' : ''}>
                          {tempQuote.total.toFixed(2)}€
                        </span>
                      </div>
                      {tempQuote.total !== quote.total && (
                        <div className="text-xs text-center mt-2">
                          <span className={tempQuote.total < quote.total ? 'text-green-700' : 'text-red-700'}>
                            {tempQuote.total < quote.total ? '-' : '+'}{Math.abs(tempQuote.total - quote.total).toFixed(2)}€
                            ({((Math.abs(tempQuote.total - quote.total) / quote.total) * 100).toFixed(1)}%)
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

            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setComparisons([])}
                className="text-gray-600"
              >
                Vider la comparaison
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}