"use server";

import { getSupabaseServiceClient } from "@/backend/supabase/client";
import { success, failure, type HandlerResult } from "@/backend/http/response";
import { authErrorCodes, type AuthErrorCode } from "../backend/error";

export type InviteValidationResult = {
  isValid: boolean;
  roomId?: string;
  roomName?: string;
};

export const validateInviteToken = async (
  token: string
): Promise<HandlerResult<InviteValidationResult, AuthErrorCode, unknown>> => {
  const client = getSupabaseServiceClient();

  // In a real implementation, you'd have an invites table to validate the token
  // For MVP, we'll check if a room with this ID exists
  // In a real app, you would:
  // 1. Check if the token exists in an invites table
  // 2. Check if it hasn't expired
  // 3. Check if the associated room still exists
  // 4. Return room details

  // For now, simply check if a room exists with this ID
  const { data: room, error } = await client
    .from('rooms')
    .select('id, name')
    .eq('id', token)
    .maybeSingle();

  if (error) {
    // Log the error but don't expose internal details
    console.error('Error validating invite token:', error);
    return failure(500, authErrorCodes.SIGNUP_FAILED, 'Failed to validate invite token');
  }

  if (!room) {
    // Token is not valid if no room exists
    return success({
      isValid: false,
    });
  }

  // Token is valid if room exists
  return success({
    isValid: true,
    roomId: room.id,
    roomName: room.name || `Room ${room.id.substring(0, 8)}`,
  });
};