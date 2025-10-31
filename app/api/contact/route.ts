// app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
//import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  message: z.string().min(5).max(5000),
  website: z.string().optional().default(""),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { name, email, message, website } = parsed.data;

    if (website && website.trim().length > 0) {
      return NextResponse.json({ ok: true });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "0.0.0.0";
    const userAgent = req.headers.get("user-agent") ?? "";

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: dbError } = await supabase.from("contacts").insert({
      name,
      email,
      message,
      ip,
      user_agent: userAgent,
    });

    if (dbError) {
      console.error(dbError);
      return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
    }

    // UNCOMMENT WHEN NEEDED
    // Email via Resend
    // const resend = new Resend(process.env.RESEND_API_KEY!);
    // await resend.emails.send({
    //   from: "Contact Form <KrzysztofJerzyMuszynski@gmail.com>",
    //   to: ["KrzysztofJerzyMuszynski@gmail.com"],
    //   subject: "New contact form message",
    //   replyTo: email,
    //   text: `Name: ${name}
    // Email: ${email}
    // Message:
    // ${message}
    //
    // IP: ${ip}
    // UA: ${userAgent}`,
    // });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
