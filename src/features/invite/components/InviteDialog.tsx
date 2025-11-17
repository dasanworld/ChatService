'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Copy } from 'lucide-react';

interface InviteDialogProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const InviteDialog = ({ roomId, isOpen, onClose }: InviteDialogProps) => {
  const [copied, setCopied] = useState(false);

  // Generate invite link (using roomId as token for simplicity)
  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}/invite/${roomId}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>방 초대하기</AlertDialogTitle>
          <AlertDialogDescription>
            이 링크를 공유하여 다른 사용자를 초대하세요.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <Input
              readOnly
              value={inviteLink}
              className="text-sm"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="px-3"
            onClick={handleCopy}
          >
            <span className="sr-only">복사</span>
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="text-sm text-slate-500">
          <p>💡 이 링크는 누구나 방에 참여할 수 있습니다.</p>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="outline">
            닫기
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
