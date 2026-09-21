import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Box, List, ListItemButton,
  ListItemText, ListItemAvatar, Avatar, Button, Typography, Stack, Tooltip,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import LoadingSpinner from './LoadingSpinner';
import ConfirmDialog from './ConfirmDialog';
import { memberService } from '../../services/memberService';
import { formatDateTime } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';

// Member profile "View Image" gallery: lists every nominee photo uploaded for
// the member (multi-image support). Clicking a row opens an inline preview —
// that's all Staff/Viewer can do. Download and Delete only show up inside the
// preview, and only for Admin (uploading is also Admin-only, enforced elsewhere).
export default function NomineeImageDialog({ open, onClose, memberId, memberName }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [images, setImages] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  const [preview, setPreview] = useState(null); // { id, url, fileName }
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !memberId) return;
    setListLoading(true);
    setListError('');
    setPreview(null);
    memberService.getNomineeImages(memberId)
      .then((data) => setImages(data || []))
      .catch(() => setListError('Failed to load nominee images'))
      .finally(() => setListLoading(false));
  }, [open, memberId]);

  // Revoke the preview's object URL whenever it changes or the dialog unmounts, to avoid leaking memory
  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const handleView = async (image) => {
    setPreviewError('');
    setPreviewLoading(true);
    setPreview({ id: image.id, url: null, fileName: image.fileName });
    try {
      const blob = await memberService.getNomineeImageBlob(memberId, image.id);
      const url = URL.createObjectURL(blob);
      setPreview({ id: image.id, url, fileName: image.fileName });
    } catch {
      setPreviewError('Failed to load this image');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!preview) return;
    setDownloading(true);
    try {
      const blob = await memberService.getNomineeImageBlob(memberId, preview.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = preview.fileName || `nominee-image-${preview.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setPreviewError('Failed to download this image');
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!preview) return;
    setDeleting(true);
    try {
      await memberService.deleteNomineeImage(memberId, preview.id);
      setImages((prev) => prev.filter((img) => img.id !== preview.id));
      setDeleteOpen(false);
      handleBackToList();
    } catch {
      setPreviewError('Failed to delete this image');
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleBackToList = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setPreviewError('');
  };

  const handleClose = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setDeleteOpen(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          {preview && (
            <IconButton size="small" onClick={handleBackToList}>
              <ArrowBackRoundedIcon fontSize="small" />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="span">
            {memberName ? `${memberName}'s Nominee Photos` : 'Nominee Photos'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ minHeight: 260, pb: 3 }}>
        {listLoading && <LoadingSpinner label="Loading images..." />}

        {!listLoading && !preview && listError && (
          <Typography color="error" variant="body2" sx={{ py: 2, textAlign: 'center' }}>{listError}</Typography>
        )}

        {!listLoading && preview && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            {previewLoading && <LoadingSpinner label="Loading image..." />}
            {!previewLoading && previewError && (
              <Typography color="error" variant="body2">{previewError}</Typography>
            )}
            {!previewLoading && !previewError && preview.url && (
              <Box
                component="img"
                src={preview.url}
                alt={preview.fileName || 'Nominee'}
                sx={{ maxWidth: '100%', maxHeight: '55vh', borderRadius: 1, objectFit: 'contain' }}
              />
            )}
            {/* Download and Delete are Admin-only — Staff/Viewer only get to view the image. */}
            {!previewLoading && !previewError && isAdmin && (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadRoundedIcon />}
                  disabled={downloading}
                  onClick={handleDownload}
                >
                  Download
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteRoundedIcon />}
                  disabled={downloading}
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete
                </Button>
              </Stack>
            )}
          </Box>
        )}

        {!listLoading && !preview && !listError && (
          images.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No nominee images uploaded yet
            </Typography>
          ) : (
            <List disablePadding>
              {images.map((image) => (
                <Tooltip key={image.id} title="View">
                  <ListItemButton divider onClick={() => handleView(image)}>
                    <ListItemAvatar>
                      <Avatar variant="rounded">
                        <ImageRoundedIcon fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={image.fileName || `Image #${image.id}`}
                      secondary={image.uploadedAt ? formatDateTime(image.uploadedAt) : null}
                    />
                  </ListItemButton>
                </Tooltip>
              ))}
            </List>
          )
        )}
      </DialogContent>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this image?"
        message="This nominee photo will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleting}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteOpen(false)}
      />
    </Dialog>
  );
}