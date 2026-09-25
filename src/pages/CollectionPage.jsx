import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Stack, Alert, Paper, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  TextField, MenuItem, InputAdornment, Autocomplete, Chip, Divider,
  List, ListItemButton, ListItemText, ClickAwayListener, Popper, CircularProgress,
} from '@mui/material';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

import { memberService } from '../services/memberService';
import { paymentService } from '../services/paymentService';
import { dashboardService } from '../services/dashboardService';
import { extractErrorMessage } from '../services/apiClient';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

import {
  formatCurrency,
  todayIso,
  isoWeekNumber,
  isoWeekYear,
} from '../utils/formatters';

import { moneyFontFamily } from '../styles/theme';
import { PAYMENT_METHODS } from '../utils/constants';

import MemberFormDialog from '../components/members/MemberFormDialog';
import ConfirmDialog from '../components/common/ConfirmDialog';
import StatusChip from '../components/common/StatusChip';
import LoadingSpinner from '../components/common/LoadingSpinner';


const GROUP_INDEX_STORAGE_KEY =
  'mfms_collection_group_index';


export default function CollectionPage() {
  const navigate = useNavigate();

  const {
    showSuccess,
    showError,
  } = useToast();

  const { user } = useAuth();

  const isViewer =
    user?.role === 'VIEWER';


  // ─────────────────────────────────────────────
  // Groups
  // Head member + sub-members
  // ─────────────────────────────────────────────

  const [groups, setGroups] =
    useState([]);

  const [groupsLoading, setGroupsLoading] =
    useState(true);

  const [groupsError, setGroupsError] =
    useState('');


  const [currentIndex, setCurrentIndex] =
    useState(() => {
      const stored = Number(
        localStorage.getItem(
          GROUP_INDEX_STORAGE_KEY
        )
      );

      return Number.isFinite(stored) &&
        stored >= 0
        ? stored
        : 0;
    });


  const [groupMembers, setGroupMembers] =
    useState([]);

  const [
    groupMembersLoading,
    setGroupMembersLoading,
  ] = useState(false);

  const [
    groupMembersError,
    setGroupMembersError,
  ] = useState('');


  // Payment drafts
  const [drafts, setDrafts] =
    useState({});

  const [savingId, setSavingId] =
    useState(null);


  // Member dialog
  const [memberDialog, setMemberDialog] =
    useState({
      open: false,
      member: null,
    });


  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [submitting, setSubmitting] =
    useState(false);


  // Close loan
  const [closeLoanTarget, setCloseLoanTarget] =
    useState(null);

  const [closingLoan, setClosingLoan] =
    useState(false);


  const currentGroup =
    groups[currentIndex] || null;


  const [groupInterest, setGroupInterest] = useState('');
  const [savingInterest, setSavingInterest] = useState(false);


  // ─────────────────────────────────────────────
  // Load groups
  // ─────────────────────────────────────────────

  const loadGroups =
    useCallback(async () => {
      setGroupsLoading(true);
      setGroupsError('');

      try {
        const result =
          await dashboardService.groups();

        setGroups(result || []);

        return result || [];
      } catch (err) {
        setGroupsError(
          extractErrorMessage(err)
        );

        return [];
      } finally {
        setGroupsLoading(false);
      }
    }, []);


  useEffect(() => {
    loadGroups();
  }, [loadGroups]);


  // Keep current group index valid
  useEffect(() => {
    if (groupsLoading) return;

    if (groups.length === 0) {
      if (currentIndex !== 0) {
        setCurrentIndex(0);
      }

      return;
    }

    if (
      currentIndex >
      groups.length - 1
    ) {
      setCurrentIndex(
        groups.length - 1
      );
    }
  }, [
    groups,
    groupsLoading,
    currentIndex,
  ]);


  // Save current group index
  useEffect(() => {
    localStorage.setItem(
      GROUP_INDEX_STORAGE_KEY,
      String(currentIndex)
    );
  }, [currentIndex]);


  // ─────────────────────────────────────────────
  // BUILD PAYMENT DRAFT
  //
  // IMPORTANT CHANGE:
  //
  // Previously the code did:
  //
  // last payment week + 1
  //
  // That was causing W36 to become W37
  // immediately after entering a payment.
  //
  // Now the target week is ALWAYS the
  // CURRENT CALENDAR WEEK.
  // ─────────────────────────────────────────────

  const buildDraftForMember =
    (member, history) => {
      const sorted =
        [...(history || [])].sort(
          (a, b) => {
            if (
              a.paymentYear !==
              b.paymentYear
            ) {
              return (
                b.paymentYear -
                a.paymentYear
              );
            }

            return (
              b.weekNumber -
              a.weekNumber
            );
          }
        );


      /*
       * IMPORTANT:
       *
       * The payment week is determined
       * by today's actual calendar week.
       *
       * Example:
       *
       * 31 Aug 2026 = W36
       *
       * It remains W36.
       *
       * When the actual date becomes
       * 7 Sep 2026, it becomes W37.
       */
      const target = {
        week: isoWeekNumber(),
        year: isoWeekYear(),
      };


      /*
       * Check whether this member already
       * has a payment for the CURRENT week.
       *
       * If yes, we update that payment
       * instead of creating another one.
       */
      const existing =
        sorted.find(
          (p) =>
            p.weekNumber ===
              target.week &&
            p.paymentYear ===
              target.year
        );


      return {
        amount: existing
          ? String(existing.amountPaid)
          : '',

        method:
          existing?.paymentMethod ||
          member.lastPaymentMethod ||
          'CASH',

        upi:
          existing?.upiTransactionId ||
          '',

        targetWeek:
          target.week,

        targetYear:
          target.year,

        existingPaymentId:
          existing?.id || null,
      };
    };


  // ─────────────────────────────────────────────
  // Load members for current group
  // ─────────────────────────────────────────────

  const loadGroupMembers =
    useCallback(
      async (headId) => {
        if (!headId) {
          setGroupMembers([]);
          setDrafts({});
          return;
        }

        setGroupMembersLoading(true);
        setGroupMembersError('');

        try {
          const [
            head,
            subMembers,
          ] = await Promise.all([
            memberService.getById(
              headId
            ),

            memberService.getSubMembers(
              headId
            ),
          ]);


          const members = [
            head,
            ...(subMembers || []),
          ];

          setGroupMembers(
            members
          );


          /*
           * Fetch each member's payment history.
           *
           * The draft week is now calculated
           * from the CURRENT calendar week.
           */
          const histories =
            await Promise.all(
              members.map(
                (m) =>
                  paymentService
                    .getByMember(m.id)
                    .catch(() => [])
              )
            );


          const nextDrafts = {};


          members.forEach(
            (m, idx) => {
              nextDrafts[m.id] =
                buildDraftForMember(
                  m,
                  histories[idx]
                );
            }
          );


          setDrafts(
            nextDrafts
          );
        } catch (err) {
          setGroupMembersError(
            extractErrorMessage(err)
          );

          setGroupMembers([]);
        } finally {
          setGroupMembersLoading(
            false
          );
        }
      },
      []
    );


  useEffect(() => {
    loadGroupMembers(
      currentGroup?.headId
    );
  }, [
    currentGroup?.headId,
    loadGroupMembers,
  ]);


   // groupMembers[0] is always the head (see loadGroupMembers), whose
  // interestPercentage represents the group's current rate.
  useEffect(() => {
    setGroupInterest(18);
  }, [groupMembers]);

  // Rebuilds the same payload shape the Edit Member form sends to
  // PUT /api/members/{id}, using the member's OWN current values for
  // everything — only interestPercentage is overridden. No new endpoint:
  // the backend already re-derives Outstanding Amount from the new rate
  // inside updateMember().
  const buildInterestPayload = (m, interestPercentage) => ({
    memberCode: m.memberCode,
    name: m.name,
    headMember: m.headMember,
    headMemberId: m.headMember ? null : (m.headMemberId || null),
    centerPlace: m.centerPlace,
    groupId: m.groupId,
    groupName: m.groupName,
    phoneNumber: m.phoneNumber,
    alternatePhoneNumber: m.alternatePhoneNumber || null,
    address: m.address,
    aadhaarNumber: m.aadhaarNumber,
    panNumber: m.panNumber,
    voterId: m.voterId,
    smartCardNumber: m.smartCardNumber,
    bankName: m.bankName,
    bankAccountNumber: m.bankAccountNumber,
    chequeNumber: m.chequeNumber,
    nomineeName: m.nomineeName,
    nomineePhoneNumber: m.nomineePhoneNumber || null,
    nomineeRelation: m.nomineeRelation,
    nomineeAadhaar: m.nomineeAadhaar,
    nomineePan: m.nomineePan,
    nomineeVoterId: m.nomineeVoterId,
    weeklyAmount: Number(m.weeklyAmount),
    loanAmount: m.loanAmount,
    totalWeeks: m.totalWeeks,
    paymentFrequency: m.paymentFrequency || 'WEEKLY',
    interestPercentage: Number(interestPercentage),
    joinDate: m.joinDate,
    weekday: m.weekday,
    notes: m.notes,
    insuranceAmount: m.insuranceAmount ?? 0,
    processingAmount: m.processingAmount ?? 0,
    ...(m.staffMemberId ? { staffMemberId: m.staffMemberId } : {}),
  });

  const handleSaveGroupInterest = async () => {
    if (!currentGroup || groupInterest === '' || groupMembers.length === 0) return;
    setSavingInterest(true);
    try {
      await Promise.all(
        groupMembers.map((m) =>
          memberService.update(m.id, buildInterestPayload(m, groupInterest))
        )
      );
      showSuccess('Interest updated for every member in the group');
      await loadGroupMembers(currentGroup.headId);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSavingInterest(false);
    }
  };


  // ─────────────────────────────────────────────
  // Group navigation
  // ─────────────────────────────────────────────

  const handlePrevGroup = () => {
    setMemberFilter(null);

    setCurrentIndex(
      (i) =>
        Math.max(
          0,
          i - 1
        )
    );
  };


  const handleNextGroup = () => {
    setMemberFilter(null);

    setCurrentIndex(
      (i) =>
        Math.min(
          groups.length - 1,
          i + 1
        )
    );
  };


  const handleJumpToGroup =
    (group) => {
      if (!group) return;

      setMemberFilter(null);

      const idx =
        groups.findIndex(
          (g) =>
            g.headId ===
            group.headId
        );

      if (idx >= 0) {
        setCurrentIndex(idx);
      }
    };


  // ─────────────────────────────────────────────
  // Draft update
  // ─────────────────────────────────────────────

  const updateDraft = (
    memberId,
    patch
  ) => {
    setDrafts(
      (prev) => ({
        ...prev,

        [memberId]: {
          ...prev[memberId],
          ...patch,
        },
      })
    );
  };


  // ─────────────────────────────────────────────
  // Refresh groups + members
  // ─────────────────────────────────────────────

  const refreshGroupsAndMembers =
    async (headId) => {
      await loadGroups();

      await loadGroupMembers(
        headId
      );
    };


  // ─────────────────────────────────────────────
  // SAVE COLLECTION
  // ─────────────────────────────────────────────

  const handleSaveCollection =
    async (member) => {
      const draft =
        drafts[member.id];

      if (!draft) return;


      const amountPaid =
        Number(draft.amount);


      if (
        !amountPaid ||
        amountPaid <= 0
      ) {
        showError(
          'Enter an amount greater than zero before saving'
        );

        return;
      }


      if (
        draft.method ===
          'ONLINE' &&
        !draft.upi
      ) {
        showError(
          'UPI transaction ID is required for online payments'
        );

        return;
      }


      setSavingId(
        member.id
      );


      try {
        /*
         * IMPORTANT:
         *
         * The week/year here come from
         * buildDraftForMember().
         *
         * Therefore they represent the
         * CURRENT calendar week.
         */
        const payload = {
          memberId:
            member.id,

          weekNumber:
            draft.targetWeek,

          paymentYear:
            draft.targetYear,

          amountPaid,

          /*
           * Payment date is today's actual date.
           */
          paymentDate:
            todayIso(),

          paymentMethod:
            draft.method ||
            'CASH',

          upiTransactionId:
            draft.method ===
            'ONLINE'
              ? draft.upi
              : null,

          remarks:
            'Collected via group-wise Collection page',
        };


        /*
         * If a payment already exists
         * for the current week, update it.
         *
         * Otherwise create a new payment.
         */
        if (
          draft.existingPaymentId
        ) {
          await paymentService.update(
            draft.existingPaymentId,
            payload
          );
        } else {
          await paymentService.create(
            payload
          );
        }


        showSuccess(
          `Collection saved for ${member.name} — Week ${draft.targetWeek}/${draft.targetYear}`
        );


        /*
         * Refresh the member and payment
         * history after saving.
         */
        const [
          refreshedMember,
          history,
        ] = await Promise.all([
          memberService.getById(
            member.id
          ),

          paymentService.getByMember(
            member.id
          ),
        ]);


        setGroupMembers(
          (prev) =>
            prev.map(
              (m) =>
                m.id === member.id
                  ? refreshedMember
                  : m
            )
        );


        /*
         * Rebuild the draft.
         *
         * IMPORTANT:
         * This will still use the CURRENT
         * calendar week, NOT next week.
         */
        updateDraft(
          member.id,
          buildDraftForMember(
            refreshedMember,
            history
          )
        );


        loadGroups();
      } catch (err) {
        showError(
          extractErrorMessage(err)
        );
      } finally {
        setSavingId(null);
      }
    };


  // ─────────────────────────────────────────────
  // CREATE MEMBER
  // ─────────────────────────────────────────────

  const handleCreateMember =
    async (payload) => {
      setSubmitting(true);

      try {
        const created =
          await memberService.create(
            payload.member
          );


        if (payload.payment) {
          await paymentService.create({
            ...payload.payment,
            memberId:
              created.id,
          });

          showSuccess(
            'Member created with initial payment recorded'
          );
        } else {
          showSuccess(
            'Member created successfully'
          );
        }


        setMemberDialog({
          open: false,
          member: null,
        });


        const affectedHeadId =
          payload.member.headMember
            ? created.id
            : (
                payload.member
                  .headMemberId ||
                currentGroup?.headId
              );


        await refreshGroupsAndMembers(
          affectedHeadId ||
          currentGroup?.headId
        );
      } catch (err) {
        showError(
          extractErrorMessage(err)
        );
      } finally {
        setSubmitting(false);
      }
    };


  // ─────────────────────────────────────────────
  // UPDATE MEMBER
  // ─────────────────────────────────────────────

  const handleUpdateMember =
    async (payload) => {
      setSubmitting(true);

      try {
        await memberService.update(
          memberDialog.member.id,
          payload.member
        );


        showSuccess(
          'Member updated successfully'
        );


        setMemberDialog({
          open: false,
          member: null,
        });


        await refreshGroupsAndMembers(
          currentGroup?.headId
        );
      } catch (err) {
        showError(
          extractErrorMessage(err)
        );
      } finally {
        setSubmitting(false);
      }
    };


  // ─────────────────────────────────────────────
  // DELETE MEMBER
  // ─────────────────────────────────────────────

  const handleDeleteConfirm =
    async () => {
      setSubmitting(true);

      try {
        await memberService.remove(
          deleteTarget.id
        );


        showSuccess(
          'Member deleted'
        );


        const wasHead =
          deleteTarget.id ===
          currentGroup?.headId;


        setDeleteTarget(null);


        if (wasHead) {
          await loadGroups();
        } else {
          await refreshGroupsAndMembers(
            currentGroup?.headId
          );
        }
      } catch (err) {
        showError(
          extractErrorMessage(err)
        );
      } finally {
        setSubmitting(false);
      }
    };


  // ─────────────────────────────────────────────
  // CLOSE LOAN
  // ─────────────────────────────────────────────

  const handleCloseLoan =
    async () => {
      if (!closeLoanTarget) {
        return;
      }


      setClosingLoan(true);

      try {
        await memberService.closeLoan(
          closeLoanTarget.id
        );


        showSuccess(
          `Loan closed for ${closeLoanTarget.name}`
        );


        setCloseLoanTarget(null);


        await loadGroupMembers(
          currentGroup?.headId
        );


        loadGroups();
      } catch (err) {
        showError(
          extractErrorMessage(err)
        );
      } finally {
        setClosingLoan(false);
      }
    };


  // ─────────────────────────────────────────────
  // SEARCH
  // ─────────────────────────────────────────────

  const [
    searchTerm,
    setSearchTerm,
  ] = useState('');


  const debouncedSearch =
    useDebouncedValue(
      searchTerm,
      350
    );


  const [
    searchResults,
    setSearchResults,
  ] = useState([]);


  const [
    searchLoading,
    setSearchLoading,
  ] = useState(false);


  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false);


  const searchAnchorRef =
    useRef(null);


  const [
    memberFilter,
    setMemberFilter,
  ] = useState(null);


  useEffect(() => {
    const term =
      debouncedSearch.trim();


    if (term.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);

      return;
    }


    let cancelled = false;


    setSearchLoading(true);


    memberService
      .collectionSearch(term)
      .then((result) => {
        if (cancelled) return;

        setSearchResults(
          result || []
        );

        setSearchOpen(true);
      })
      .catch(() => {
        if (!cancelled) {
          setSearchResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSearchLoading(false);
        }
      });


    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);


  // ─────────────────────────────────────────────
  // Select search result
  // ─────────────────────────────────────────────

  const handleSelectSearchResult =
    async (result) => {
      const idx =
        groups.findIndex(
          (g) =>
            g.headId ===
            result.headId
        );


      if (idx >= 0) {
        setCurrentIndex(idx);
      } else {
        const latest =
          await loadGroups();

        const retryIdx =
          latest.findIndex(
            (g) =>
              g.headId ===
              result.headId
          );


        if (retryIdx >= 0) {
          setCurrentIndex(
            retryIdx
          );
        }
      }


      setMemberFilter(
        result.type === 'MEMBER'
          ? {
              id:
                result.memberId,

              name:
                result.memberName,
            }
          : null
      );


      setSearchTerm('');
      setSearchOpen(false);
    };


  // ─────────────────────────────────────────────
  // Displayed members
  // ─────────────────────────────────────────────

  const displayedMembers =
    memberFilter
      ? groupMembers.filter(
          (m) =>
            m.id ===
            memberFilter.id
        )
      : groupMembers;


  const groupLabel =
    currentGroup
      ? `${currentGroup.headName}'s Group${
          currentGroup.centerPlace
            ? ` · ${currentGroup.centerPlace}`
            : ''
        }`
      : '';


  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────

  return (
    <Box>

      {/* PAGE HEADER */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          justifyContent:
            'space-between',
          mb: 2,
        }}
      >
        <Typography variant="h5">
          Collection
        </Typography>


        {!isViewer && (
          <Button
            variant="contained"
            startIcon={
              <AddRoundedIcon />
            }
            onClick={() =>
              setMemberDialog({
                open: true,
                member: null,
              })
            }
          >
            Create member
          </Button>
        )}
      </Box>


      {/* SEARCH */}
      <Box
        sx={{
          position: 'relative',
          mb: 2,
        }}
        ref={searchAnchorRef}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Search by name, phone number, group Id, or member ID..."
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
          onFocus={() =>
            searchResults.length >
              0 &&
            setSearchOpen(true)
          }
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  {searchLoading ? (
                    <CircularProgress
                      size={18}
                    />
                  ) : (
                    <SearchRoundedIcon
                      fontSize="small"
                    />
                  )}
                </InputAdornment>
              ),
            },
          }}
        />


        <Popper
          open={
            searchOpen &&
            searchResults.length >
              0
          }
          anchorEl={
            searchAnchorRef.current
          }
          placement="bottom-start"
          sx={{
            zIndex: 1300,
            width:
              searchAnchorRef.current
                ?.offsetWidth,
          }}
        >
          <ClickAwayListener
            onClickAway={() =>
              setSearchOpen(false)
            }
          >
            <Paper
              variant="outlined"
              sx={{
                maxHeight: 320,
                overflowY: 'auto',
                mt: 0.5,
              }}
            >
              <List
                dense
                disablePadding
              >
                {searchResults.map(
                  (
                    result,
                    idx
                  ) => (
                    <ListItemButton
                      key={`${result.type}-${result.headId}-${result.memberId || idx}`}
                      onClick={() =>
                        handleSelectSearchResult(
                          result
                        )
                      }
                    >
                      {result.type ===
'GROUP' ? (
  <ListItemText
    primary={`${result.headName}'s Group${
      result.groupId
        ? ` · Group ${result.groupId}`
        : ''
    }`}
    secondary={`Members: ${(result.memberNames || []).join(', ')}`}
  />
) : (
                        <ListItemText
                          primary={`${result.memberName} (${result.memberCode})`}
                          secondary={[
                            result.phoneNumber,

                            result.headId !==
                            result.memberId
                              ? `in ${result.headName}'s group`
                              : 'Head member',

                            result.centerPlace,
                          ]
                            .filter(Boolean)
                            .join(
                              ' · '
                            )}
                        />
                      )}
                    </ListItemButton>
                  )
                )}
              </List>
            </Paper>
          </ClickAwayListener>
        </Popper>
      </Box>


      {/* GROUP ERROR */}
      {groupsError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
        >
          {groupsError}
        </Alert>
      )}


      {/* GROUP LOADING */}
      {groupsLoading ? (
        <LoadingSpinner
          label="Loading groups..."
        />
      ) : groups.length ===
        0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            textAlign: 'center',
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
          >
            No groups found yet.
            Create a head member
            to start a new group.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* GROUP HEADER */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2,
            }}
          >
            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              spacing={2}
              alignItems={{
                sm: 'center',
              }}
              justifyContent="space-between"
            >

              {/* GROUP NAVIGATION */}
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
              >

                <Tooltip title="Previous group">
                  <span>
                    <IconButton
                      onClick={
                        handlePrevGroup
                      }
                      disabled={
                        currentIndex ===
                        0
                      }
                    >
                      <ArrowBackIosNewRoundedIcon
                        fontSize="small"
                      />
                    </IconButton>
                  </span>
                </Tooltip>


                <Box
                  sx={{
                    minWidth: 220,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Group{' '}
                    {currentIndex +
                      1}{' '}
                    of{' '}
                    {groups.length}
                  </Typography>


                  <Typography
                    variant="h6"
                    sx={{
                      lineHeight: 1.2,
                    }}
                  >
                    {groupLabel}
                  </Typography>
                </Box>


                <Tooltip title="Next group">
                  <span>
                    <IconButton
                      onClick={
                        handleNextGroup
                      }
                      disabled={
                        currentIndex ===
                        groups.length -
                          1
                      }
                    >
                      <ArrowForwardIosRoundedIcon
                        fontSize="small"
                      />
                    </IconButton>
                  </span>
                </Tooltip>

              </Stack>


              {/* JUMP TO GROUP */}
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" rowGap={1}>
                <Autocomplete
                  size="small"
                  sx={{
                    minWidth: 280,
                  }}
                  options={groups}
                  value={
                    currentGroup
                  }
                  isOptionEqualToValue={(
                    opt,
                    val
                  ) =>
                    opt.headId ===
                    val?.headId
                  }
                  getOptionLabel={(
                    g
                  ) =>
                    `${g.headName} (${g.headMemberCode})`
                  }
                  onChange={(
                    _,
                    value
                  ) =>
                    handleJumpToGroup(
                      value
                    )
                  }
                  renderInput={(
                    params
                  ) => (
                    <TextField
                      {...params}
                      label="Jump to group"
                    />
                  )}
                />

                <TextField
                  size="small"
                  type="number"
                  label="Interest (%)"
                  sx={{ width: 140 }}
                  value={groupInterest}
                  onChange={(e) => setGroupInterest(e.target.value)}
                  disabled={!currentGroup || isViewer}
                  slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
                />

                <Tooltip title="Apply this interest rate to every member in the group and recalculate Outstanding Amount">
                  <span>
                    <IconButton
                      color="primary"
                      disabled={!currentGroup || isViewer || savingInterest || groupInterest === ''}
                      onClick={handleSaveGroupInterest}
                    >
                      {savingInterest ? <CircularProgress size={20} /> : <SaveRoundedIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>

            </Stack>


            {/* GROUP DETAILS */}
            {currentGroup && (
              <>
                <Divider
                  sx={{ my: 1.5 }}
                />


                <Stack
                  direction="row"
                  spacing={3}
                  flexWrap="wrap"
                  rowGap={1}
                >

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Members:{' '}
                    <strong>
                      {
                        currentGroup.totalMembers
                      }
                    </strong>
                  </Typography>


                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Collected this
                    week:{' '}
                    <strong
                      style={{
                        fontFamily:
                          moneyFontFamily,
                      }}
                    >
                      {formatCurrency(
                        currentGroup.totalCollectedThisWeek
                      )}
                    </strong>
                  </Typography>


                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Expected this
                    week:{' '}
                    <strong
                      style={{
                        fontFamily:
                          moneyFontFamily,
                      }}
                    >
                      {formatCurrency(
                        currentGroup.totalExpectedThisWeek
                      )}
                    </strong>
                  </Typography>


                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Remaining:{' '}
                    <strong
                      style={{
                        fontFamily:
                          moneyFontFamily,
                      }}
                    >
                      {formatCurrency(
                        currentGroup.remainingThisWeek
                      )}
                    </strong>
                  </Typography>


                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Bill Generated:{' '}
                    <strong>
                      {
                        currentGroup.billGenerated ??
                        0
                      }
                    </strong>
                  </Typography>

                </Stack>
              </>
            )}
          </Paper>


          {/* MEMBER ERROR */}
          {groupMembersError && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
            >
              {groupMembersError}
            </Alert>
          )}


          {/* MEMBER LOADING */}
          {groupMembersLoading ? (
            <LoadingSpinner
              label="Loading group members..."
            />
          ) : displayedMembers.length ===
            0 ? (
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                textAlign: 'center',
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
              >
                {memberFilter
                  ? 'This member could not be found in the group.'
                  : 'This group has no members yet.'}
              </Typography>
            </Paper>
          ) : (
            <Paper variant="outlined">

              <TableContainer
                sx={{
                  overflowX:
                    'auto',
                }}
              >
                <Table
                  size="small"
                  sx={{
                    minWidth: 980,
                  }}
                >

                  {/* TABLE HEADER */}
                  <TableHead>
                    <TableRow>

                      <TableCell>
                        Member
                      </TableCell>

                      <TableCell>
                        Week
                      </TableCell>

                      <TableCell align="right">
                        Weekly amount
                      </TableCell>

                      <TableCell align="right">
                        Pending
                      </TableCell>

                      <TableCell>
                        Status
                      </TableCell>

                      <TableCell>
                        Amount paid
                      </TableCell>

                      <TableCell>
                        Method
                      </TableCell>

                      <TableCell>
                        Actions
                      </TableCell>

                    </TableRow>
                  </TableHead>


                  {/* TABLE BODY */}
                  <TableBody>

                    {displayedMembers.map(
                      (member) => {
                        const draft =
                          drafts[
                            member.id
                          ] || {
                            amount: '',
                            method:
                              'CASH',
                            upi: '',
                          };


                        const isLoanClosed =
                          member.status ===
                          'CLOSED';


                        const canCloseLoanHere =
                          !isLoanClosed &&
                          Number(
                            member.totalBalance
                          ) <= 0 &&
                          Number(
                            member.totalPaid
                          ) > 0;


                        return (
                          <TableRow
                            key={
                              member.id
                            }
                            hover
                          >

                            {/* MEMBER */}
                            <TableCell
                              sx={{
                                minWidth: 200,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 500,
                                  cursor:
                                    'pointer',
                                  '&:hover':
                                    {
                                      textDecoration:
                                        'none',
                                    },
                                }}
                                onClick={() =>
                                  navigate(
                                    `/collection/${member.id}`
                                  )
                                }
                              >
                                {member.name}

                                {member.headMember && (
                                  <Chip
                                    label="HEAD"
                                    size="small"
                                    color="warning"
                                    sx={{
                                      ml: 1,
                                    }}
                                  />
                                )}
                              </Typography>


                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {
                                  member.memberCode
                                }{' '}
                                ·{' '}
                                {
                                  member.phoneNumber
                                }
                              </Typography>
                            </TableCell>


                            {/* WEEK */}
                            <TableCell>
                              <Chip
                                size="small"
                                variant="outlined"
                                label={
                                  draft.targetWeek
                                    ? `W${draft.targetWeek} / ${draft.targetYear}`
                                    : '—'
                                }
                              />


                              {draft.existingPaymentId && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  display="block"
                                >
                                </Typography>
                              )}
                            </TableCell>


                            {/* WEEKLY AMOUNT */}
                            <TableCell
                              align="right"
                              sx={{
                                fontFamily:
                                  moneyFontFamily,
                              }}
                            >
                              {formatCurrency(
                                member.weeklyAmount
                              )}
                            </TableCell>


                            {/* PENDING */}
                            <TableCell
                              align="right"
                              sx={{
                                fontFamily:
                                  moneyFontFamily,
                              }}
                            >
                              {formatCurrency(
                                member.remainingAmount
                              )}
                            </TableCell>


                            {/* STATUS */}
                            <TableCell>
                              {isLoanClosed ? (
                                <StatusChip
                                  status="CLOSED"
                                />
                              ) : (
                                <Tooltip
                                  title={
                                    canCloseLoanHere
                                      ? 'All payments are complete — click to close this loan'
                                      : ''
                                  }
                                >
                                  <span>
                                    <StatusChip
                                      status={
                                        member.currentWeekStatus
                                      }
                                      onClick={
                                        canCloseLoanHere
                                          ? () =>
                                              setCloseLoanTarget(
                                                member
                                              )
                                          : undefined
                                      }
                                    />
                                  </span>
                                </Tooltip>
                              )}
                            </TableCell>


                            {/* AMOUNT PAID */}
                            <TableCell
                              sx={{
                                minWidth: 150,
                              }}
                            >
                              <TextField
                                size="small"
                                type="number"
                                value={
                                  draft.amount
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateDraft(
                                    member.id,
                                    {
                                      amount:
                                        e
                                          .target
                                          .value,
                                    }
                                  )
                                }
                                sx={{
                                  width: 140,
                                }}
                                slotProps={{
                                  input: {
                                    startAdornment:
                                      (
                                        <InputAdornment position="start">
                                          ₹
                                        </InputAdornment>
                                      ),
                                  },
                                }}
                              />
                            </TableCell>


                            {/* PAYMENT METHOD */}
                            <TableCell
                              sx={{
                                minWidth: 190,
                              }}
                            >
                              <Stack
                                spacing={
                                  0.5
                                }
                              >

                                <TextField
                                  size="small"
                                  select
                                  value={
                                    draft.method
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    updateDraft(
                                      member.id,
                                      {
                                        method:
                                          e
                                            .target
                                            .value,
                                      }
                                    )
                                  }
                                  sx={{
                                    width: 130,
                                  }}
                                >
                                  {PAYMENT_METHODS.map(
                                    (m) => (
                                      <MenuItem
                                        key={
                                          m
                                        }
                                        value={
                                          m
                                        }
                                      >
                                        {m ===
                                        'ONLINE'
                                          ? 'Online'
                                          : 'Cash'}
                                      </MenuItem>
                                    )
                                  )}
                                </TextField>


                                {draft.method ===
                                  'ONLINE' && (
                                  <TextField
                                    size="small"
                                    placeholder="UPI txn ID"
                                    value={
                                      draft.upi
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      updateDraft(
                                        member.id,
                                        {
                                          upi:
                                            e
                                              .target
                                              .value,
                                        }
                                      )
                                    }
                                    sx={{
                                      width: 160,
                                    }}
                                  />
                                )}

                              </Stack>
                            </TableCell>


                            {/* ACTIONS */}
                            <TableCell>
                              <Stack
                                direction="row"
                                spacing={
                                  0.25
                                }
                              >

                                {/* SAVE */}
                                <Tooltip title="Save collection">
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      disabled={
                                        savingId ===
                                        member.id
                                      }
                                      onClick={() =>
                                        handleSaveCollection(
                                          member
                                        )
                                      }
                                    >
                                      <SaveRoundedIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>


                                {/* PAYMENT HISTORY */}
                                <Tooltip title="Payment history">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      navigate(
                                        `/collection/${member.id}`
                                      )
                                    }
                                  >
                                    <ReceiptLongRoundedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>


                                {/* EDIT MEMBER */}
                                <Tooltip title="Edit member">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      setMemberDialog(
                                        {
                                          open: true,
                                          member,
                                        }
                                      )
                                    }
                                  >
                                    <EditRoundedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>


                                {/* DELETE MEMBER */}
                                <Tooltip title="Delete member">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      setDeleteTarget(
                                        member
                                      )
                                    }
                                  >
                                    <DeleteRoundedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>

                              </Stack>
                            </TableCell>

                          </TableRow>
                        );
                      }
                    )}

                  </TableBody>

                </Table>
              </TableContainer>

            </Paper>
          )}
        </>
      )}


      {/* MEMBER FORM */}
      <MemberFormDialog
        open={
          memberDialog.open
        }
        member={
          memberDialog.member
        }
        submitting={
          submitting
        }
        onSubmit={
          memberDialog.member
            ? handleUpdateMember
            : handleCreateMember
        }
        onClose={() =>
          setMemberDialog({
            open: false,
            member: null,
          })
        }
      />


      {/* DELETE MEMBER CONFIRMATION */}
      <ConfirmDialog
        open={Boolean(
          deleteTarget
        )}
        title="Delete member?"
        message={`This will permanently delete ${deleteTarget?.name} and all their payment history. This cannot be undone.`}
        loading={
          submitting
        }
        onConfirm={
          handleDeleteConfirm
        }
        onCancel={() =>
          setDeleteTarget(null)
        }
      />


      {/* CLOSE LOAN CONFIRMATION */}
      <ConfirmDialog
        open={Boolean(
          closeLoanTarget
        )}
        title="Close loan?"
        message={
          closeLoanTarget
            ? `This marks ${closeLoanTarget.name}'s loan as CLOSED (total paid: ${formatCurrency(closeLoanTarget.totalPaid)}). This cannot be undone from here.`
            : ''
        }
        confirmLabel="Close Loan"
        confirmColor="primary"
        loading={
          closingLoan
        }
        onConfirm={
          handleCloseLoan
        }
        onCancel={() =>
          setCloseLoanTarget(null)
        }
      />

    </Box>
  );
}