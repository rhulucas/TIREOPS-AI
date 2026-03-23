"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ThreadRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => { router.replace(`/email?threadId=${id}`); }, [id, router]);
  return null;
}
