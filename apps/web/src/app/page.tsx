import { redirect } from "next/navigation";

// Redireciona para /login — autenticação acontece lá
export default function RootPage() {
  redirect("/login");
}
