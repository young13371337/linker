import { useEffect, useState } from "react";
import Image from "next/image";
import { FaRegEdit, FaTimes } from "react-icons/fa";
import { useSession, signIn } from "next-auth/react";

export default function WallPage() {
  const { data: session, status } = useSession();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");

  useEffect(() => {
    fetch("/api/posts" + (session?.user?.id ? `?userId=${session.user.id}` : ""))
      .then(r => r.json())
      .then(data => {
        setPosts(data.posts || []);
        setLoading(false);
      })
      .catch(() => {
        setPosts([]);
        setLoading(false);
      });
  }, [submitting, session]);



  // Этот файл удалён. Стена постов больше не существует.
