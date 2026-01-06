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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 }
      );
    }

    // First, get the patient to check if they have a linked auth user
    const { data: patient, error: fetchError } = await supabaseAdmin
      .from("patients")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching patient:", fetchError);
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    // If patient has a linked auth user, delete them from auth
    if (patient.user_id) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
        patient.user_id
      );

      if (authDeleteError) {
        console.error("Error deleting auth user:", authDeleteError);
        // Continue with patient deletion even if auth deletion fails
        // The user might have already been deleted or doesn't exist
      }
    }

    // Delete the patient from the database
    const { error: deleteError } = await supabaseAdmin
      .from("patients")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting patient:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete patient" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/patients/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

