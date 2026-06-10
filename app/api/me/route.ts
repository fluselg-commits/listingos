import { createSupabaseAdminClient } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const ADMIN_EMAILS = ["connerkohls@gmail.com"];

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ user: null, profile: null }, { status: 200 });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createSupabaseAdminClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return Response.json({ user: null, profile: null }, { status: 200 });
    }

    const email = user.email || "";
    const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!existingProfile) {
      const newProfile = {
        id: user.id,
        email,
        plan: isAdmin ? "admin" : "free",
        monthly_limit: isAdmin ? 999999 : 5,
        listings_used: 0,
      };

      await supabase.from("profiles").insert(newProfile);

      return Response.json({
        user: { id: user.id, email },
        profile: newProfile,
      });
    }

    if (isAdmin && existingProfile.plan !== "admin") {
      await supabase
        .from("profiles")
        .update({
          plan: "admin",
          monthly_limit: 999999,
        })
        .eq("id", user.id);

      return Response.json({
        user: { id: user.id, email },
        profile: {
          ...existingProfile,
          plan: "admin",
          monthly_limit: 999999,
        },
      });
    }

    return Response.json({
      user: { id: user.id, email },
      profile: existingProfile,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Profil konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
