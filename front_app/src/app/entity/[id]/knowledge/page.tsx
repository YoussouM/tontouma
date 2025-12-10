"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Trash2, FileText, Upload, Plus, Sparkles, Loader2, Database, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UploadBox } from "@/components/UploadBox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import api from "@/lib/api";
import { KBDocument } from "@/types";
import { cn } from "@/lib/utils";

export default function KnowledgePage() {
    const params = useParams();
    const entityId = params.id as string;
    const [documents, setDocuments] = useState<KBDocument[]>([]);
    const [textTitle, setTextTitle] = useState<string>("");
    const [textContent, setTextContent] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const fetchDocuments = useCallback(async () => {
        try {
            const res = await api.get<KBDocument[]>(`/kb/documents/${entityId}`);
            setDocuments(res.data);
        } catch (error) {
            console.error("Failed to fetch documents", error);
        } finally {
            setIsLoading(false);
        }
    }, [entityId]);

    const handleSubmitText = async () => {
        if (!textTitle.trim() || !textContent.trim()) return;
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("title", textTitle.trim());
            formData.append("content", textContent);
            formData.append("entity_id", entityId);
            await api.post("/kb/text", formData);
            setTextTitle("");
            setTextContent("");
            fetchDocuments();
        } catch (error) {
            console.error(error);
            alert("Erreur lors de l'ajout.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpload = async (files: FileList) => {
        const file = files[0];
        if (!file) return;

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", file.name);
        formData.append("entity_id", entityId);

        try {
            await api.post("/kb/documents", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            fetchDocuments();
        } catch (error) {
            console.error(error);
            alert("Erreur lors de l'upload.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Supprimer ce document ?")) return;
        try {
            await api.delete(`/kb/documents/${id}`);
            fetchDocuments();
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (entityId) fetchDocuments();
    }, [entityId, fetchDocuments]);

    return (
        <div className="h-[calc(100vh-6rem)] w-full rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 flex gap-6 overflow-hidden">

            {/* Left Column: Actions (Sticky/Fixed) */}
            <div className="w-[400px] flex flex-col gap-6 shrink-0 h-full overflow-hidden">
                <div className="shrink-0 space-y-2">
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Database className="h-6 w-6 text-indigo-600" />
                        Base de Connaissance
                    </h1>
                    <p className="text-sm text-slate-500">
                        Ajoutez des documents pour enrichir l'IA.
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                    {/* Add File Card */}
                    <Card className="border-indigo-100 bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2 text-indigo-900">
                                <Upload className="h-4 w-4" /> Importer un fichier
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <UploadBox onUpload={handleUpload} accept=".pdf,.txt,.docx" />
                            <p className="mt-3 text-[10px] text-slate-400 text-center">
                                PDF, TXT, DOCX acceptés. Vectorisation auto.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Add Text Card */}
                    <Card className="border-indigo-100 bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2 text-indigo-900">
                                <Plus className="h-4 w-4" /> Ajouter du texte brut
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Input
                                placeholder="Titre du document"
                                value={textTitle}
                                onChange={(e) => setTextTitle(e.target.value)}
                                className="bg-white/80"
                            />
                            <Textarea
                                placeholder="Collez le contenu ici..."
                                className="min-h-[120px] bg-white/80 resize-none"
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                            />
                            <Button
                                onClick={handleSubmitText}
                                disabled={isSubmitting || !textTitle || !textContent}
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Right Column: List (Scrollable) */}
            <div className="flex-1 flex flex-col h-full bg-white/40 rounded-xl border border-white/60 backdrop-blur-md overflow-hidden shadow-lg">
                <div className="p-4 border-b border-indigo-50 bg-white/50 flex justify-between items-center shrink-0">
                    <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                        Documents ({documents.length})
                    </h2>
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
                </div>

                <ScrollArea className="flex-1 p-4">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {documents.map((doc) => (
                            <div
                                key={doc.doc_id}
                                className="group relative flex flex-col gap-3 rounded-xl border border-indigo-50 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-indigo-200"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                            <FileType className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-slate-800 line-clamp-1" title={doc.title}>
                                                {doc.title}
                                            </h3>
                                            <p className="text-xs text-slate-400">
                                                {new Date(doc.created_at || Date.now()).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => handleDelete(doc.doc_id, e)}
                                        className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-500 leading-relaxed max-h-[100px] overflow-hidden relative">
                                    {doc.chunks && doc.chunks.length > 0
                                        ? doc.chunks[0].content
                                        : <span className="italic text-slate-400">En cours de traitement...</span>
                                    }
                                    <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-slate-50 to-transparent" />
                                </div>

                                <div className="flex gap-2">
                                    <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-100 bg-indigo-50/50">
                                        {doc.chunks?.length || 0} fragments
                                    </Badge>
                                </div>
                            </div>
                        ))}

                        {!isLoading && documents.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                                <Sparkles className="h-12 w-12 text-indigo-100 mb-4" />
                                <p>Aucun document pour le moment.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
