import { useRef, useState } from 'react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useLoginActions } from '@/hooks/useLoginActions';
import { Paperclip, Pen, Image, Tag } from 'lucide-react';
import { useUploadFile } from '@/hooks/useUploadFile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PostNotePage() {
  const [noteContent, setNoteContent] = useState('');
  const [noteImageFiles, setNoteImageFiles] = useState<File[]>([]);
  const noteFileInputRef = useRef<HTMLInputElement>(null);

  const [imageCaption, setImageCaption] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const adFileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useCurrentUser();
  const { mutateAsync: createEvent, isPending: isPublishing } = useNostrPublish();
  const { extension } = useLoginActions();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();

  const handleNoteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).slice(0, 10);
      setNoteImageFiles(prev => {
        const combined = [...prev, ...selected];
        return combined.slice(0, 10);
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    noteFileInputRef.current?.click();
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!noteContent.trim() && noteImageFiles.length === 0) {
      toast.error('Note content or a media file is required.');
      return;
    }

    // --- Step 1: Ensure user is logged in (get public key) ---
    if (!user) {
      try {
        await extension(); // This will prompt the user to log in
        // After awaiting, check if user is now available. If not, user cancelled or failed.
        if (!user) { // Re-check user after extension() call
          toast.error("Login required to proceed.");
          return;
        }
      } catch (error) {
        toast.error(`Login failed: ${error.message}`);
        return;
      }
    }

    // --- Step 2: Upload images (if selected) ---
    const uploadedUrls: string[] = [];
    const allImetaTags: string[][] = [];

    for (const file of noteImageFiles) {
      try {
        const [[_, url], ...restTags] = await uploadFile(file);
        uploadedUrls.push(url);
        allImetaTags.push(...restTags);
      } catch (error) {
        toast.error(`Image upload failed: ${error.message}`);
        return;
      }
    }

    // --- Step 3: Prepare and publish note event ---
    const urlSuffix = uploadedUrls.length > 0 ? '\n' + uploadedUrls.join('\n') : '';
    const content = noteContent + urlSuffix;
    const tags: string[][] = [...allImetaTags];

    try {
      await createEvent({
        kind: 1,
        content: content,
        tags: tags,
      });
      toast.success('Note posted successfully!');
      setNoteContent('');
      setNoteImageFiles([]);
      if (noteFileInputRef.current) {
        noteFileInputRef.current.value = '';
      }
    } catch (error) {
      toast.error(`Failed to post note: ${error.message}`);
    }
  };

  const handleSubmitImage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageFile) {
      toast.error('Please select an image to post.');
      return;
    }

    // --- Step 1: Ensure user is logged in (get public key) ---
    if (!user) {
      try {
        await extension();
        if (!user) { // Re-check user after extension() call
          toast.error("Login required to proceed.");
          return;
        }
      } catch (error) {
        toast.error(`Login failed: ${error.message}`);
        return;
      }
    }

    // --- Step 2: Upload image ---
    let nip94Tags: string[][] = [];

    try {
      nip94Tags = await uploadFile(imageFile);
    } catch (error) {
      toast.error(`Image upload failed: ${error.message}`);
      return;
    }

    // --- Step 3: Publish Kind 20 event (NIP-68) ---
    const url = nip94Tags.find(([t]) => t === 'url')?.[1] ?? '';
    const dim = nip94Tags.find(([t]) => t === 'dim')?.[1];
    const imeta: string[] = ['imeta', `url ${url}`];
    if (dim) imeta.push(`dim ${dim}`);

    try {
      await createEvent({
        kind: 20,
        content: imageCaption.trim(),
        tags: [imeta],
      });
      toast.success('Image posted!');
      setImageFile(null);
      setImageCaption('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast.error(`Failed to post image: ${error.message}`);
    }
  };

  const handleSubmitAd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adTitle.trim() || !adDescription.trim()) {
      toast.error('Title and description are required.');
      return;
    }

    if (!adSummary.trim()) {
      toast.error('Summary is required.');
      return;
    }

    if (!user) {
      try {
        await extension();
        if (!user) {
          toast.error("Login required to proceed.");
          return;
        }
      } catch (error) {
        toast.error(`Login failed: ${(error as Error).message}`);
        return;
      }
    }

    let imageUrl = '';
    let imetaTags: string[][] = [];

    if (adImageFile) {
      try {
        const [[_, url], ...restTags] = await uploadFile(adImageFile);
        imageUrl = url;
        imetaTags = restTags;
      } catch (error) {
        toast.error(`Image upload failed: ${(error as Error).message}`);
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

    if (adPrice.trim()) {
      tags.push(['price', adPrice.trim(), adCurrency.trim() || 'USD']);
    }
    if (adLocation.trim()) {
      tags.push(['location', adLocation.trim()]);
    }
    if (adCategory.trim()) {
      tags.push(['t', adCategory.trim().toLowerCase()]);
    }
    if (adStock.trim()) {
      tags.push(['quantity', adStock.trim()]);
    }
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
      await createEvent({
        kind: 30402,
        content: adDescription.trim(),
        tags,
      });
      toast.success('Classified ad posted!');
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
      if (adFileInputRef.current) adFileInputRef.current.value = '';
    } catch (error) {
      toast.error(`Failed to post ad: ${(error as Error).message}`);
    }
  };

  const isSubmitting = isPublishing || isUploading;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-[10%] w-full max-w-2xl px-4 max-h-[85vh] overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle>Post a new...</CardTitle> {/* Changed title */}
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="note" className="w-full">
              <TabsList className="flex w-full bg-muted text-muted-foreground rounded-t-lg border-b-0">
                <TabsTrigger value="note" className="flex-1 rounded-t-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground"><Pen className="h-5 w-5" /></TabsTrigger>
                <div className="w-px bg-border self-stretch my-1" />
                <TabsTrigger value="image" className="flex-1 rounded-t-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground"><Image className="h-5 w-5" /></TabsTrigger>
                <div className="w-px bg-border self-stretch my-1" />
                <TabsTrigger value="classified" className="flex-1 rounded-t-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground"><Tag className="h-5 w-5" /></TabsTrigger>
              </TabsList>
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
                    <input
                      type="file"
                      ref={noteFileInputRef}
                      onChange={handleNoteFileChange}
                      className="hidden"
                      accept="image/*,video/*"
                      multiple
                    />
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        onClick={handleUploadClick}
                        variant="outline"
                        size="icon"
                        disabled={isSubmitting || noteImageFiles.length >= 10}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {noteImageFiles.length > 0 ? `${noteImageFiles.length}/10 file${noteImageFiles.length > 1 ? 's' : ''} selected` : ''}
                      </span>
                      <Button type="submit" disabled={isSubmitting} className="ml-auto">
                        {isSubmitting ? 'Signing...' : 'Sign'}
                      </Button>
                    </div>
                    {noteImageFiles.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {noteImageFiles.map((f, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted rounded px-2 py-0.5">
                            {f.name}
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => setNoteImageFiles(prev => prev.filter((_, j) => j !== i))}
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
              <TabsContent value="image">
                <form onSubmit={handleSubmitImage} className="space-y-4 mt-4">
                  <Input
                    placeholder="Caption (optional)"
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*"
                    />
                    <Button
                      type="button"
                      onClick={handleUploadClick}
                      variant="outline"
                      size="icon"
                      disabled={isSubmitting}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    {imageFile && (
                      <span className="text-sm text-muted-foreground">
                        {imageFile.name}
                      </span>
                    )}
                    <Button type="submit" disabled={isSubmitting || !imageFile}>
                      {isSubmitting ? 'Signing...' : 'Sign Image'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="classified">
                <form onSubmit={handleSubmitAd} className="space-y-3 mt-4">
                  <Input
                    placeholder="Title *"
                    value={adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <Input
                    placeholder="Summary *"
                    value={adSummary}
                    onChange={(e) => setAdSummary(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <Textarea
                    placeholder="Description *"
                    value={adDescription}
                    onChange={(e) => setAdDescription(e.target.value)}
                    rows={4}
                    disabled={isSubmitting}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Price"
                      value={adPrice}
                      onChange={(e) => setAdPrice(e.target.value)}
                      disabled={isSubmitting}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Currency"
                      value={adCurrency}
                      onChange={(e) => setAdCurrency(e.target.value)}
                      disabled={isSubmitting}
                      className="w-24"
                    />
                  </div>
                  <Input
                    placeholder="Location"
                    value={adLocation}
                    onChange={(e) => setAdLocation(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <Input
                    placeholder="Category (e.g. electronics, furniture)"
                    value={adCategory}
                    onChange={(e) => setAdCategory(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <Input
                    type="number"
                    placeholder="Stock"
                    min="0"
                    value={adStock}
                    onChange={(e) => setAdStock(e.target.value)}
                    disabled={isSubmitting}
                    className="w-28"
                  />
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAdSpecs(prev => [...prev, { name: '', value: '' }])}
                        disabled={isSubmitting}
                      >
                        + Add spec
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      ref={adFileInputRef}
                      onChange={(e) => { if (e.target.files?.[0]) setAdImageFile(e.target.files[0]); }}
                      className="hidden"
                      accept="image/*"
                    />
                    <Button
                      type="button"
                      onClick={() => adFileInputRef.current?.click()}
                      variant="outline"
                      size="icon"
                      disabled={isSubmitting}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    {adImageFile && (
                      <span className="text-sm text-muted-foreground">{adImageFile.name}</span>
                    )}
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
