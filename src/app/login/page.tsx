import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { SimpleLoginScreen } from "@/components/auth/simple-login-screen";
import { getCurrentUser } from "@/lib/auth";
import { getAuthorizationForUser } from "@/lib/authorization";
import { isInitialSetupAvailable } from "@/lib/setup";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    if (user.mustChangePassword) redirect("/change-password");
    const authorization = await getAuthorizationForUser(user.id);
    redirect(authorization?.permissions.has("dashboard:view") ? "/dashboard" : authorization?.permissions.has("checkins:manage") ? "/scan" : "/forbidden");
  }
  if (await isInitialSetupAvailable()) {
    redirect("/signup");
  }

  return (
    <SimpleLoginScreen productName="Praxis">
      <LoginForm />
    </SimpleLoginScreen>
  );
}
