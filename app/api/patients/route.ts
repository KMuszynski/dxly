import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create admin client with service role for user management
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      first_name,
      last_name,
      date_of_birth,
      gender,
      phone,
      email,
      address,
      pesel,
      password,
    } = body;

    // Validation
    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    if (!date_of_birth) {
      return NextResponse.json(
        { error: "Date of birth is required" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required for authentication" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if a patient with this email already exists
    const { data: existingPatient } = await supabaseAdmin
      .from("patients")
      .select("id")
      .eq("email", email.trim())
      .single();

    if (existingPatient) {
      return NextResponse.json(
        { error: "A patient with this email already exists" },
        { status: 400 }
      );
    }

    // Create auth user - the handle_new_user() trigger will automatically create
    // the patient record when type='patient' is in the metadata
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          type: "patient",
          name: first_name.trim(),
          surname: last_name.trim(),
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          date_of_birth,
          gender: gender || "unknown",
        },
      });

    if (authError) {
      console.error("Error creating auth user:", authError);
      return NextResponse.json(
        { error: authError.message || "Failed to create user account" },
        { status: 400 }
      );
    }

    // The trigger created the patient record, now update it with additional fields
    // that the trigger doesn't handle (phone, address, pesel)
    const { data: patient, error: updateError } = await supabaseAdmin
      .from("patients")
      .update({
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        pesel: pesel?.trim() || null,
      })
      .eq("user_id", authData.user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating patient with additional fields:", updateError);
      // Patient was created by trigger, just log the error but don't fail
    }

    return NextResponse.json({ success: true, patient });
  } catch (error) {
    console.error("Error in POST /api/patients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

