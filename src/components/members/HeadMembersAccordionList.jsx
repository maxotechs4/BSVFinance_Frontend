import { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { memberService } from '../../services/memberService';
import HeadMemberAccordionRow from './HeadMemberAccordionRow';

/** True if the keyword matches the head's own fields (not their sub-members). */
function headMatchesDirectly(head, keyword) {
  if (!keyword) return true;
  const kw = keyword.toLowerCase();
  return [head.name, head.phoneNumber, head.memberCode, head.centerPlace]
    .some((v) => v?.toLowerCase().includes(kw));
}

function subMemberMatches(sub, keyword) {
  const kw = keyword.toLowerCase();
  return [sub.name, sub.phoneNumber, sub.memberCode, sub.centerPlace]
    .some((v) => v?.toLowerCase().includes(kw));
}

/**
 * Renders a list of head members as an accordion: only one head's
 * sub-members are expanded at a time. Sub-members are fetched lazily
 * on first expand and cached for the rest of the session so re-toggling
 * the same head doesn't refetch.
 *
 * When searchKeyword matches a sub-member's name rather than the head's own
 * fields, that head is auto-expanded and only the matching sub-member(s) are
 * shown — searching "Kumar" surfaces Kumar directly, not their head's whole
 * group.
 *
 * Call `invalidateHead(headId)` (exposed via the onCacheRef prop) after a
 * create/update/delete so the next expand re-fetches fresh data.
 */
export default function HeadMembersAccordionList({
  heads, onEdit, onDelete, onOpenProfile, onEditCharges, cacheRef, searchKeyword = '',
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [subMembersCache, setSubMembersCache] = useState({}); // { [headId]: MemberResponse[] }
  const [loadingId, setLoadingId] = useState(null);

  const fetchSubMembers = async (headId) => {
    setLoadingId(headId);
    try {
      const data = await memberService.getSubMembers(headId);
      setSubMembersCache((prev) => ({ ...prev, [headId]: data }));
    } catch {
      setSubMembersCache((prev) => ({ ...prev, [headId]: [] }));
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggle = (headId) => {
    if (expandedId === headId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(headId);
    if (!subMembersCache[headId]) {
      fetchSubMembers(headId);
    }
  };

  // Auto-expand when a search only matched via a sub-member, so the person
  // doesn't have to click to find the member they just searched for.
  useEffect(() => {
    if (!searchKeyword || heads.length !== 1) return;
    const [onlyHead] = heads;
    if (!headMatchesDirectly(onlyHead, searchKeyword)) {
      setExpandedId(onlyHead.id);
      if (!subMembersCache[onlyHead.id]) {
        fetchSubMembers(onlyHead.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heads, searchKeyword]);

  // Let the parent page force a refetch for one head (e.g. after adding a
  // sub-member under it, or editing/deleting one) without us exposing
  // internal state directly.
  if (cacheRef) {
    cacheRef.current = {
      invalidateHead: (headId) => {
        setSubMembersCache((prev) => {
          const next = { ...prev };
          delete next[headId];
          return next;
        });
        if (expandedId === headId) fetchSubMembers(headId);
      },
    };
  }

  if (heads.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No head members found. Create one to get started.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {heads.map((head) => {
        const allSubMembers = subMembersCache[head.id] || [];
        const onlyMatchedViaSubMember = searchKeyword && !headMatchesDirectly(head, searchKeyword);
        const visibleSubMembers = onlyMatchedViaSubMember
          ? allSubMembers.filter((sub) => subMemberMatches(sub, searchKeyword))
          : allSubMembers;

        return (
          <HeadMemberAccordionRow
            key={head.id}
            head={head}
            expanded={expandedId === head.id}
            onToggle={handleToggle}
            subMembers={visibleSubMembers}
            subMembersLoading={loadingId === head.id}
            filteredNotice={onlyMatchedViaSubMember
              ? `Showing members matching "${searchKeyword}"`
              : null}
            onEdit={onEdit}
            onDelete={onDelete}
            onOpenProfile={onOpenProfile}
            onEditCharges={onEditCharges}
          />
        );
      })}
    </Box>
  );
}
