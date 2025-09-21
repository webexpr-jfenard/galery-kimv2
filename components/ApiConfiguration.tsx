import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { configureRealAPI } from "../services/storageService";

interface ApiConfigurationProps {
  onConfigurationChange?: () => void;
}

export function ApiConfiguration({ onConfigurationChange }: ApiConfigurationProps) {
  const [useRealAPI, setUseRealAPI] = useState(false);
  const [supabaseConfig, setSupabaseConfig] = useState({
    url: "https://ugfkyfmthbwqoeauyqlz.supabase.co",
    apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZmt5Zm10aGJ3cW9lYXV5cWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NjU0MzksImV4cCI6MjA2NTI0MTQzOX0.0hr_vXm8xjkGytwbY0mR6OPs_9SR6hmiv8ucNSaRJ0U",
    bucket: "photos",
    folder: "gallery"
  });
  const [googleDriveConfig, setGoogleDriveConfig] = useState({
    apiKey: "",
    folderId: ""
  });

  const handleSaveConfiguration = () => {
    if (useRealAPI) {
      // Validate required fields
      if (!supabaseConfig.url || !supabaseConfig.apiKey) {
        toast.error("Veuillez fournir l'URL Supabase et la clé API pour utiliser l'API réelle");
        return;
      }
    }

    configureRealAPI({
      useRealAPI,
      supabaseUrl: supabaseConfig.url,
      supabaseApiKey: supabaseConfig.apiKey,
      supabaseBucket: supabaseConfig.bucket,
      supabaseFolder: supabaseConfig.folder,
      googleDriveApiKey: googleDriveConfig.apiKey,
      googleDriveFolderId: googleDriveConfig.folderId
    });

    toast.success(
      useRealAPI 
        ? "Configuration API réelle sauvegardée ! La galerie va maintenant récupérer depuis votre stockage." 
        : "API fictive activée. La galerie utilisera des photos d'exemple."
    );

    onConfigurationChange?.();
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Configuration API</CardTitle>
        <p className="text-muted-foreground">
          Configurez vos fournisseurs de stockage pour récupérer de vraies photos ou utilisez des données fictives pour les tests.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="use-real-api"
            checked={useRealAPI}
            onCheckedChange={setUseRealAPI}
          />
          <Label htmlFor="use-real-api">
            Utiliser l'API réelle (désactiver pour utiliser des données fictives)
          </Label>
        </div>

        {useRealAPI && (
          <Tabs defaultValue="supabase" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="supabase">Supabase</TabsTrigger>
              <TabsTrigger value="googledrive">Google Drive</TabsTrigger>
            </TabsList>
            
            <TabsContent value="supabase" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supabase-url">URL Supabase *</Label>
                <Input
                  id="supabase-url"
                  placeholder="https://your-project.supabase.co"
                  value={supabaseConfig.url}
                  onChange={(e) => setSupabaseConfig(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supabase-key">Clé Anon Supabase *</Label>
                <Input
                  id="supabase-key"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseConfig.apiKey}
                  onChange={(e) => setSupabaseConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supabase-bucket">Bucket de stockage</Label>
                <Input
                  id="supabase-bucket"
                  placeholder="photos"
                  value={supabaseConfig.bucket}
                  onChange={(e) => setSupabaseConfig(prev => ({ ...prev, bucket: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supabase-folder">Chemin du dossier</Label>
                <Input
                  id="supabase-folder"
                  placeholder="gallery"
                  value={supabaseConfig.folder}
                  onChange={(e) => setSupabaseConfig(prev => ({ ...prev, folder: e.target.value }))}
                />
              </div>
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p><strong>Instructions de configuration :</strong></p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Installer le client Supabase : <code>npm install @supabase/supabase-js</code></li>
                  <li>Créer un bucket de stockage dans votre tableau de bord Supabase</li>
                  <li>Télécharger des photos dans votre bucket/dossier</li>
                  <li>Assurez-vous que votre bucket a un accès public pour les URL des photos</li>
                </ol>
              </div>
            </TabsContent>
            
            <TabsContent value="googledrive" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="drive-key">Clé API Google Drive</Label>
                <Input
                  id="drive-key"
                  type="password"
                  placeholder="AIzaSyC..."
                  value={googleDriveConfig.apiKey}
                  onChange={(e) => setGoogleDriveConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drive-folder">ID du dossier</Label>
                <Input
                  id="drive-folder"
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  value={googleDriveConfig.folderId}
                  onChange={(e) => setGoogleDriveConfig(prev => ({ ...prev, folderId: e.target.value }))}
                />
              </div>
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p><strong>Instructions de configuration :</strong></p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Créer un projet dans Google Cloud Console</li>
                  <li>Activer l'API Google Drive</li>
                  <li>Créer une clé API avec accès à l'API Drive</li>
                  <li>Rendre votre dossier Drive accessible publiquement</li>
                  <li>Copier l'ID du dossier depuis l'URL Drive</li>
                </ol>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <Button onClick={handleSaveConfiguration} className="w-full">
          Sauvegarder la configuration
        </Button>
      </CardContent>
    </Card>
  );
}