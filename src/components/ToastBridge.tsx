"use client";
// The store's showToast(message) predates the feedback layer; this forwards
// each message to the house toasts, picking the tone from the wording.
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/uiFeedback";

export default function ToastBridge() {
  const message = useStore((s) => s.toast);
  const toast = useToast();
  useEffect(() => {
    if (!message) return;
    if (/fail|error|could not|couldn't/i.test(message)) toast.error(message);
    else if (/copied|saved|loaded|restored/i.test(message)) toast.success(message);
    else toast.info(message);
  }, [message, toast]);
  return null;
}
