"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AudioRecorderProps {
    onRecordingComplete: (blob: Blob) => void;
    isProcessing?: boolean;
    disabled?: boolean;
}

export function AudioRecorder({ onRecordingComplete, isProcessing = false, disabled = false }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && isRecording) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isRecording]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/wav" });
                onRecordingComplete(blob);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Impossible d'accéder au microphone");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleClick = () => {
        if (isProcessing || disabled) return;
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={disabled || isProcessing}
            className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2",
                isRecording
                    ? "bg-red-500 text-white ring-2 ring-red-400 ring-offset-2 animate-pulse"
                    : "bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600",
                disabled && "opacity-50 cursor-not-allowed",
                isProcessing && "cursor-wait"
            )}
            title={isRecording ? "Arrêter l'enregistrement" : "Enregistrer un message vocal"}
        >
            {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            ) : isRecording ? (
                <Square className="h-4 w-4 fill-current" />
            ) : (
                <Mic className="h-5 w-5" />
            )}

            {/* Recording Indicator Wave (Visual only) */}
            {isRecording && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-20"></span>
            )}
        </button>
    );
}
