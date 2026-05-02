import { useEffect, useRef, useState } from 'react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLoginActions } from '@/hooks/useLoginActions';
import { Paperclip, Pen, Image, Tag, X } from 'lucide-react';
import { useUploadFile } from '@/hooks/useUploadFile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PostNotePage() {
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotification({ message, type });
    notifTimer.current = setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => () => { if (notifTimer.current) clearTimeout(notifTimer.current); }, []);

  // Note tab state
  const [noteContent, setNoteContent] = useState('');
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [noteInputKey, setNoteInputKey] = useState(0);

  // Image tab state
  const [imageCaption, setImageCaption] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageInputKey, setImageInputKey] = useState(0);

  // Classified ad state
  const [adTitle, setAdTitle] = useState('');
  const [adSummary, setAdSummary] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adPrice, setAdPrice] = useState('');
  const [adCurrency, setAdCurrency] = useState('USD');
  const [adLocation, setAdLocation] = useState('');
  const [adCategory, setAdCategory] = useState('');
  const [adStock, setAdStock] = useState('1');
  const [adSpecs, setAdSpecs] = useState<{ name: string; value: string }[]>([{ name: '', value: '' }]);
  const [adImageFile, setAdImageFile] = useState<File | null>(null);
  const [adInputKey, setAdInputKey] = useState(0);

  const { user } = useCurrentUser();
  const { mutateAsync: createEvent, isPending: isPublishing } = useNostrPublish();
  const { extension } = useLoginActions();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();

  const isSubmitting = isPublishing || isUploading;

  const ensureLoggedIn = async () => {
    if (user) return true;
    try {
      await extension();
      return !!user;
    } catch {
      notify('Login failed', 'error');
      return false;
    }
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!noteContent.trim() && noteFiles.length === 0) {
      notify('Note content or a media file is required.', 'error');
      return;
    }

    if (!await ensureLoggedIn()) return;

    const uploadedUrls: string[] = [];
    const allImetaTags: string[][] = [];

    for (let i = 0; i < noteFiles.length; i++) {
      try {
        const [[_, url], ...restTags] = await uploadFile(noteFiles[i]);
        uploadedUrls.push(url);
        allImetaTags.push(...restTags);
      } catch (error) {
        notify(`Upload failed (file ${i + 1}): ${(error as Error).message}`, 'error');
        return;
      }
    }

    const urlSuffix = uploadedUrls.length > 0 ? '\n' + uploadedUrls.join('\n') : '';
    const content = noteContent + urlSuffix;
    const tags: string[][] = [...allImetaTags];

    try {
      await createEvent({ kind: 1, content, tags });
      setNoteContent('');
      setNoteFiles([]);
      setNoteInputKey(k => k + 1);
      notify('Note posted!');
    } catch (error) {
      notify(`Failed to post note: ${(error as Error).message}`, 'error');
    }
  };

  const handleSubmitImage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageFile) {
      notify('Please select an image to post.', 'error');
      return;
    }

    if (!await ensureLoggedIn()) return;

    let nip94Tags: string[][] = [];
    try {
      nip94Tags = await uploadFile(imageFile);
    } catch (error) {
      notify(`Image upload failed: ${(error as Error).message}`, 'error');
      return;
    }

    const url = nip94Tags.find(([t]) => t === 'url')?.[1] ?? '';
    const dim = nip94Tags.find(([t]) => t === 'dim')?.[1];
    const imeta: string[] = ['imeta', `url ${url}`];
    if (dim) imeta.push(`dim ${dim}`);

    try {
      await createEvent({ kind: 20, content: imageCaption.trim(), tags: [imeta] });
      setImageFile(null);
      setImageCaption('');
      setImageInputKey(k => k + 1);
      notify('Image posted!');
    } catch (error) {
      notify(`Failed to post image: ${(error as Error).message}`, 'error');
    }
  };

  const handleSubmitAd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adTitle.trim() || !adDescription.trim()) {
      notify('Title and description are required.', 'error');
      return;
    }
    if (!adSummary.trim()) {
      notify('Summary is required.', 'error');
      return;
    }

    if (!await ensureLoggedIn()) return;

    let imageUrl = '';
    let imetaTags: string[][] = [];

    if (adImageFile) {
      try {
        const [[_, url], ...restTags] = await uploadFile(adImageFile);
        imageUrl = url;
        imetaTags = restTags;
      } catch (error) {
        notify(`Image upload failed: ${(error as Error).message}`, 'error');
        return;
      }
    }

    const d = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000).toString();
    const tags: string[][] = [
      ['d', d],
      ['title', adTitle.trim()],
      ['summary', adSummary.trim()],
      ['published_at', now],
      ['status', 'active'],
    ];

    if (adPrice.trim()) tags.push(['price', adPrice.trim(), adCurrency.trim() || 'USD']);
    if (adLocation.trim()) tags.push(['location', adLocation.trim()]);
    if (adCategory.trim()) tags.push(['t', adCategory.trim().toLowerCase()]);
    if (adStock.trim()) tags.push(['quantity', adStock.trim()]);
    for (const spec of adSpecs) {
      if (spec.name.trim() && spec.value.trim()) {
        tags.push(['spec', spec.name.trim(), spec.value.trim()]);
      }
    }
    if (imageUrl) {
      tags.push(['image', imageUrl]);
      tags.push(...imetaTags);
    }

    try {
      await createEvent({ kind: 30402, content: adDescription.trim(), tags });
      setAdTitle('');
      setAdSummary('');
      setAdDescription('');
      setAdPrice('');
      setAdCurrency('USD');
      setAdLocation('');
      setAdCategory('');
      setAdStock('1');
      setAdSpecs([{ name: '', value: '' }]);
      setAdImageFile(null);
      setAdInputKey(k => k + 1);
      notify('Classified ad posted!');
    } catch (error) {
      notify(`Failed to post ad: ${(error as Error).message}`, 'error');
    }
  };

  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-[10%] w-full max-w-2xl px-4 max-h-[85vh] overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle>Post a new...</CardTitle>
        </CardHeader>
        <CardContent>
          {notification && (
            <div className={`flex items-center justify-between rounded-md px-3 py-2 mb-3 text-sm ${notification.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
              <span>{notification.message}</span>
              <button type="button" onClick={() => setNotification(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>
            </div>
          )}
          <Tabs defaultValue="note" className="w-full">
            <TabsList className="flex w-full bg-muted text-muted-foreground rounded-t-lg border-b-0">
              <TabsTrigger value="note" className="flex-1 rounded-t-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground"><Pen className="h-5 w-5" /></TabsTrigger>
              <div className="w-px bg-border self-stretch my-1" />
              <TabsTrigger value="image" className="flex-1 rounded-t-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground"><Image className="h-5 w-5" /></TabsTrigger>
              <div className="w-px bg-border self-stretch my-1" />
              <TabsTrigger value="classified" className="flex-1 rounded-t-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground"><Tag className="h-5 w-5" /></TabsTrigger>
            </TabsList>

            {/* Note tab */}
            <TabsContent value="note">
              <form onSubmit={handleSubmitNote} className="space-y-4 mt-4">
                <Textarea
                  placeholder="What's on your mind?"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={5}
                  disabled={isSubmitting}
                />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <label className="cursor-pointer">
                      <input
                        key={noteInputKey}
                        type="file"
                        className="hidden"
                        accept="image/*,video/*"
                        multiple
                        disabled={isSubmitting || noteFiles.length >= 10}
                        onChange={(e) => {
                          if (e.target.files) {
                            const selected = Array.from(e.target.files);
                            setNoteFiles(prev => [...prev, ...selected].slice(0, 10));
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={isSubmitting || noteFiles.length >= 10}
                        asChild
                      >
                        <span><Paperclip className="h-4 w-4" /></span>
                      </Button>
                    </label>
                    <span className="text-sm text-muted-foreground">
                      {noteFiles.length > 0 ? `${noteFiles.length}/10 file${noteFiles.length > 1 ? 's' : ''} selected` : ''}
                    </span>
                    <Button type="submit" disabled={isSubmitting} className="ml-auto">
                      {isSubmitting ? 'Signing...' : 'Sign'}
                    </Button>
                  </div>
                  {noteFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {noteFiles.map((f, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted rounded px-2 py-0.5">
                          {f.name}
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setNoteFiles(prev => prev.filter((_, j) => j !== i))}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </TabsContent>

            {/* Image tab */}
            <TabsContent value="image">
              <form onSubmit={handleSubmitImage} className="space-y-4 mt-4">
                <Input
                  placeholder="Caption (optional)"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  disabled={isSubmitting}
                />
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer">
                    <input
                      key={imageInputKey}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      disabled={isSubmitting}
                      onChange={(e) => {
                        if (e.target.files?.[0]) setImageFile(e.target.files[0]);
                      }}
                    />
                    <Button type="button" variant="outline" size="icon" disabled={isSubmitting} asChild>
                      <span><Paperclip className="h-4 w-4" /></span>
                    </Button>
                  </label>
                  {imageFile && (
                    <span className="text-sm text-muted-foreground">{imageFile.name}</span>
                  )}
                  <Button type="submit" disabled={isSubmitting || !imageFile}>
                    {isSubmitting ? 'Signing...' : 'Sign Image'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Classified tab */}
            <TabsContent value="classified">
              <form onSubmit={handleSubmitAd} className="space-y-3 mt-4">
                <Input placeholder="Title *" value={adTitle} onChange={(e) => setAdTitle(e.target.value)} disabled={isSubmitting} />
                <Input placeholder="Summary *" value={adSummary} onChange={(e) => setAdSummary(e.target.value)} disabled={isSubmitting} />
                <Textarea placeholder="Description *" value={adDescription} onChange={(e) => setAdDescription(e.target.value)} rows={4} disabled={isSubmitting} />
                <div className="flex gap-2">
                  <Input placeholder="Price" value={adPrice} onChange={(e) => setAdPrice(e.target.value)} disabled={isSubmitting} className="flex-1" />
                  <Input placeholder="Currency" value={adCurrency} onChange={(e) => setAdCurrency(e.target.value)} disabled={isSubmitting} className="w-24" />
                </div>
                <Input placeholder="Location" value={adLocation} onChange={(e) => setAdLocation(e.target.value)} disabled={isSubmitting} />
                <Input placeholder="Category (e.g. electronics, furniture)" value={adCategory} onChange={(e) => setAdCategory(e.target.value)} disabled={isSubmitting} />
                <Input type="number" placeholder="Stock" min="0" value={adStock} onChange={(e) => setAdStock(e.target.value)} disabled={isSubmitting} className="w-28" />
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {adSpecs.map((spec, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="Spec name"
                        value={spec.name}
                        onChange={(e) => setAdSpecs(prev => prev.map((s, j) => j === i ? { ...s, name: e.target.value } : s))}
                        disabled={isSubmitting}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Value"
                        value={spec.value}
                        onChange={(e) => setAdSpecs(prev => prev.map((s, j) => j === i ? { ...s, value: e.target.value } : s))}
                        disabled={isSubmitting}
                        className="flex-1"
                      />
                    </div>
                  ))}
                  {adSpecs.length < 5 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setAdSpecs(prev => [...prev, { name: '', value: '' }])} disabled={isSubmitting}>
                      + Add spec
                    </Button>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer">
                    <input
                      key={adInputKey}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      disabled={isSubmitting}
                      onChange={(e) => { if (e.target.files?.[0]) setAdImageFile(e.target.files[0]); }}
                    />
                    <Button type="button" variant="outline" size="icon" disabled={isSubmitting} asChild>
                      <span><Paperclip className="h-4 w-4" /></span>
                    </Button>
                  </label>
                  {adImageFile && <span className="text-sm text-muted-foreground">{adImageFile.name}</span>}
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Signing...' : 'Post Ad'}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
