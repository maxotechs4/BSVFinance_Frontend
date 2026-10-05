import { useEffect, useMemo, useState } from 'react';

import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Stack,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Chip,
} from '@mui/material';

import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';

import { memberService } from '../../services/memberService';
import { paymentService } from '../../services/paymentService';
import { staffService } from '../../services/staffService';

import { extractErrorMessage } from '../../services/apiClient';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';

import {
  formatCurrency,
  isoWeekNumber,
  isoWeekYear,
  weekdayLabel,
} from '../../utils/formatters';

import { moneyFontFamily } from '../../styles/theme';
import { WEEKDAY_OPTIONS } from '../../utils/constants';

import LoadingSpinner from '../common/LoadingSpinner';
import StarRoundedIcon from '@mui/icons-material/StarRounded';


// Dashboard-style text buttons (Print / Export PNG)
const textActionSx = {
  fontWeight: 600,
  fontSize: '0.85rem',
  color: 'text.secondary',
  '&:hover': {
    bgcolor: (theme) =>
      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)',
  },
  '&.Mui-disabled': {
    color: 'text.disabled',
  },
};


/* =========================================================
   WEEKLY COLLECTION AMOUNT
   ========================================================= */

function getWeeklyCollectionAmount(member) {

  const amount =
    member.weeklyCollectionAmount ??
    member.weeklyPaymentAmount ??
    member.weeklyAmount ??
    member.weeklyCollection ??
    member.weeklyInstallmentAmount ??
    member.installmentAmount;

  if (
    amount === null ||
    amount === undefined ||
    amount === ''
  ) {
    return null;
  }

  const numericAmount = Number(amount);

  if (Number.isNaN(numericAmount)) {
    return null;
  }

  return numericAmount;
}


/* =========================================================
   WEEKLY COLLECTION DISPLAY
   ========================================================= */

function weeklyCollectionLabel(member) {
  const amount =
    getWeeklyCollectionAmount(member);

  if (
    amount === null ||
    amount === undefined
  ) {
    return '-';
  }

  return formatCurrency(amount);
}


/* =========================================================
   GET LATEST PAYMENT
   ========================================================= */

function getLatestPayment(payments) {
  if (
    !payments ||
    payments.length === 0
  ) {
    return null;
  }

  const sortedPayments =
    [...payments].sort((a, b) => {
      const yearA =
        Number(a.paymentYear || 0);

      const yearB =
        Number(b.paymentYear || 0);

      /*
       * First compare payment year.
       */

      if (yearA !== yearB) {
        return yearB - yearA;
      }

      const weekA =
        Number(a.weekNumber || 0);

      const weekB =
        Number(b.weekNumber || 0);

      if (weekA !== weekB) {
        return weekB - weekA;
      }

      const dateA =
        a.paymentDate
          ? new Date(
              a.paymentDate
            ).getTime()
          : 0;

      const dateB =
        b.paymentDate
          ? new Date(
              b.paymentDate
            ).getTime()
          : 0;

      return dateB - dateA;
    });

  return sortedPayments[0];
}


/* =========================================================
   GET NUMBER OF ISO WEEKS IN A YEAR
   ========================================================= */

function getIsoWeeksInYear(year) {

  const december31 =
    new Date(
      Date.UTC(
        year,
        11,
        31
      )
    );

  const day =
    december31.getUTCDay() || 7;

  if (day === 4) {
    return 53;
  }

  if (
    day === 5 &&
    new Date(
      Date.UTC(
        year,
        1,
        29
      )
    ).getUTCDate() === 29
  ) {
    return 53;
  }

  return 52;
}


/* =========================================================
   GET NEXT ISO PAYMENT WEEK
   ========================================================= */

function getNextPaymentWeek(
  latestPayment
) {

  if (
    !latestPayment ||
    latestPayment.weekNumber === null ||
    latestPayment.weekNumber === undefined
  ) {
    return {
      week: isoWeekNumber(),
      year: isoWeekYear(),
    };
  }


  const lastWeek =
    Number(
      latestPayment.weekNumber
    );

  const lastYear =
    Number(
      latestPayment.paymentYear
    );


  if (
    Number.isNaN(lastWeek) ||
    Number.isNaN(lastYear) ||
    lastWeek <= 0
  ) {
    return {
      week: isoWeekNumber(),
      year: isoWeekYear(),
    };
  }


  const weeksInYear =
    getIsoWeeksInYear(
      lastYear
    );


  if (
    lastWeek <
    weeksInYear
  ) {
    return {
      week:
        lastWeek + 1,
      year:
        lastYear,
    };
  }


  return {
    week: 1,
    year:
      lastYear + 1,
  };
}


/* =========================================================
   GET MEMBER STAFF ID
   ========================================================= */

function getMemberStaffId(member) {
  if (
    member.staffMemberId !== null &&
    member.staffMemberId !== undefined
  ) {
    return String(
      member.staffMemberId
    );
  }

  return '';
}


/* =========================================================
   GET MEMBER STAFF NAME
   ========================================================= */

function getMemberStaffName(member) {
  if (member.staffMemberName) {
    return member.staffMemberName;
  }

  return '';
}


/* =========================================================
   GET CENTER CODE
   ========================================================= */

function getMemberCenterCode(member) {
  return (
    member.centerCode ||
    member.center?.centerCode ||
    member.center?.code ||
    '-'
  );
}


/* =========================================================
   PRINT TABLE STYLES
   ========================================================= */

const printTableSx = {
  '@media print': {
    borderCollapse: 'collapse',
    border: '1px solid #000',

    '& th, & td': {
      border: '1px solid #000',
      padding: '6px 10px',
    },
  },
};


/* =========================================================
   COMPONENT
   ========================================================= */

export default function WeekdayMembersPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const {
    showSuccess,
    showError,
  } = useToast();


  const [
    weekday,
    setWeekday,
  ] = useState('');


  const [
    selectedStaff,
    setSelectedStaff,
  ] = useState('');


  const [
    staffList,
    setStaffList,
  ] = useState([]);


  const [
    members,
    setMembers,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    staffLoading,
    setStaffLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState('');


  /* =======================================================
     LOAD STAFF
     ======================================================= */

    useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let cancelled = false;


    const loadStaff = async () => {
      setStaffLoading(true);


      try {
        const result =
          await staffService.list();


        if (!cancelled) {
          setStaffList(
            result || []
          );
        }

      } catch (err) {
        if (!cancelled) {
          showError(
            extractErrorMessage(err)
          );
        }

      } finally {
        if (!cancelled) {
          setStaffLoading(false);
        }
      }
    };


    loadStaff();


    return () => {
      cancelled = true;
    };

  }, [showError]);


  /* =======================================================
     LOAD MEMBERS BY WEEKDAY
     ======================================================= */

  useEffect(() => {
    if (!weekday) {
      setMembers([]);
      setError('');
      return;
    }


    let cancelled = false;


    const loadMembers = async () => {
      setLoading(true);
      setError('');


      try {
        const result =
          await memberService.getByWeekday(
            weekday
          );


        if (cancelled) {
          return;
        }


        const memberList =
          result || [];


        const membersWithPaymentHistory =
          await Promise.all(
            memberList.map(
              async (member) => {

                try {
                  const payments =
                    await paymentService.getByMember(
                      member.id
                    );


                  const latestPayment =
                    getLatestPayment(
                      payments || []
                    );


                  const nextPayment =
                    getNextPaymentWeek(
                      latestPayment
                    );


                  return {
                    ...member,


                    lastPaymentWeek:
                      latestPayment?.weekNumber ??
                      null,

                    lastPaymentYear:
                      latestPayment?.paymentYear ??
                      null,

                    lastPaymentDate:
                      latestPayment?.paymentDate ??
                      null,

                    nextPaymentWeek:
                      nextPayment.week,

                    nextPaymentYear:
                      nextPayment.year,
                  };

                } catch (err) {


                  return {
                    ...member,

                    lastPaymentWeek:
                      null,

                    lastPaymentYear:
                      null,

                    lastPaymentDate:
                      null,

                    nextPaymentWeek:
                      isoWeekNumber(),

                    nextPaymentYear:
                      isoWeekYear(),
                  };
                }
              }
            )
          );


        if (cancelled) {
          return;
        }


        setMembers(
          membersWithPaymentHistory
        );

      } catch (err) {

        if (!cancelled) {
          setError(
            extractErrorMessage(err)
          );
        }

      } finally {

        if (!cancelled) {
          setLoading(false);
        }
      }
    };


    loadMembers();


    return () => {
      cancelled = true;
    };

  }, [weekday]);


  /* =======================================================
     FILTER MEMBERS BY STAFF
     ======================================================= */

  const filteredMembers =
    useMemo(() => {

      if (!selectedStaff) {
        return members;
      }


      return members.filter(
        (member) => {

          const memberStaffId =
            getMemberStaffId(
              member
            );


          return (
            memberStaffId ===
            String(
              selectedStaff
            )
          );
        }
      );

    }, [
      members,
      selectedStaff,
    ]);


  /* =======================================================
     SELECTED STAFF NAME
     ======================================================= */

  const selectedStaffName =
    useMemo(() => {

      if (!selectedStaff) {
        return 'All Staff';
      }


      return (
        staffList.find(
          (staff) =>
            String(
              staff.id
            ) ===
            String(
              selectedStaff
            )
        )?.name ||
        'Selected Staff'
      );

    }, [
      selectedStaff,
      staffList,
    ]);


  /* =======================================================
     PRINT
     ======================================================= */

  const handlePrint = () => {
    window.print();
  };


  /* =======================================================
     DRAW WRAPPED TEXT
     ======================================================= */

  const drawWrappedText = (
    ctx,
    text,
    x,
    y,
    maxWidth,
    lineHeight,
    maxLines = 3
  ) => {

    const value =
      text === null ||
      text === undefined ||
      text === ''
        ? '-'
        : String(text);


    const words =
      value.split(' ');


    const lines = [];


    let currentLine = '';


    words.forEach(
      (word) => {

        const testLine =
          currentLine
            ? `${currentLine} ${word}`
            : word;


        const width =
          ctx.measureText(
            testLine
          ).width;


        if (
          width <= maxWidth
        ) {
          currentLine =
            testLine;

        } else {

          if (currentLine) {
            lines.push(
              currentLine
            );
          }

          currentLine =
            word;
        }
      }
    );


    if (currentLine) {
      lines.push(
        currentLine
      );
    }


    const visibleLines =
      lines.slice(
        0,
        maxLines
      );


    if (
      lines.length >
      maxLines
    ) {

      const lastIndex =
        visibleLines.length -
        1;


      let lastLine =
        visibleLines[
          lastIndex
        ];


      while (
        ctx.measureText(
          `${lastLine}...`
        ).width >
          maxWidth &&
        lastLine.length > 0
      ) {

        lastLine =
          lastLine.slice(
            0,
            -1
          );
      }


      visibleLines[
        lastIndex
      ] =
        `${lastLine}...`;
    }


    visibleLines.forEach(
      (line, index) => {

        ctx.fillText(
          line,
          x,
          y +
            index *
              lineHeight
        );
      }
    );


    return visibleLines.length;
  };


  /* =======================================================
     EXPORT PNG
     ======================================================= */

  const handleExportPng = () => {

    if (
      !weekday ||
      filteredMembers.length === 0
    ) {

      showError(
        'Select a weekday and staff with members before exporting'
      );

      return;
    }


    try {

      const scale = 2;


      const columns = [

        {
          key: 'centerCode',
          label: 'Center Code',
          width: 140,
        },

        {
          key: 'name',
          label: 'Member Name',
          width: 190,
        },

        {
          key: 'phoneNumber',
          label: 'Phone Number',
          width: 150,
        },

        {
          key: 'centerPlace',
          label: 'Center Place',
          width: 160,
        },

        {
          key: 'amount',
          label: 'Amount',
          width: 150,
        },

        {
          key: 'amountToPay',
          label: 'Amount to Pay',
          width: 180,
        },

        {
          key: 'week',
          label: 'Week',
          width: 100,
        },

      ];


      const tableWidth =
        columns.reduce(
          (sum, column) =>
            sum +
            column.width,
          0
        );


      const titleHeight = 95;

      const headerHeight = 50;

      const rowHeight = 65;

      const totalHeight = 55;


      const canvasWidth =
        tableWidth + 40;


      const canvasHeight =
        titleHeight +
        headerHeight +
        filteredMembers.length *
          rowHeight +
        totalHeight +
        40;


      const canvas =
        document.createElement(
          'canvas'
        );


      canvas.width =
        canvasWidth * scale;


      canvas.height =
        canvasHeight * scale;


      const ctx =
        canvas.getContext(
          '2d'
        );


      if (!ctx) {

        throw new Error(
          'Unable to create image canvas'
        );
      }


      ctx.scale(
        scale,
        scale
      );


      /* ===================================================
         BACKGROUND
         =================================================== */

      ctx.fillStyle =
        '#ffffff';


      ctx.fillRect(
        0,
        0,
        canvasWidth,
        canvasHeight
      );


      /* ===================================================
         TITLE
         =================================================== */

      ctx.fillStyle =
        '#111111';


      ctx.font =
        'bold 26px Arial, sans-serif';


      ctx.fillText(
        `Weekday Collection — ${weekdayLabel(
          weekday
        )}`,
        20,
        35
      );


      /* ===================================================
         STAFF
         =================================================== */

      ctx.font =
        '16px Arial, sans-serif';


      ctx.fillStyle =
        '#444444';


      ctx.fillText(
        `Staff: ${selectedStaffName}`,
        20,
        62
      );


      /* ===================================================
         TABLE POSITION
         =================================================== */

      const tableX = 20;

      const tableY =
        titleHeight;


      /* ===================================================
         HEADER BACKGROUND
         =================================================== */

      ctx.fillStyle =
        '#eeeeee';


      ctx.fillRect(
        tableX,
        tableY,
        tableWidth,
        headerHeight
      );


      /* ===================================================
         HEADER TEXT
         =================================================== */

      ctx.fillStyle =
        '#111111';


      ctx.font =
        'bold 14px Arial, sans-serif';


      let currentX =
        tableX;


      columns.forEach(
        (column) => {

          ctx.fillText(
            column.label,
            currentX + 8,
            tableY + 30
          );


          currentX +=
            column.width;
        }
      );


      /* ===================================================
         HEADER BORDER
         =================================================== */

      ctx.strokeStyle =
        '#555555';


      ctx.lineWidth = 1;


      ctx.strokeRect(
        tableX,
        tableY,
        tableWidth,
        headerHeight
      );


      currentX =
        tableX;


      columns.forEach(
        (column) => {

          currentX +=
            column.width;


          ctx.beginPath();


          ctx.moveTo(
            currentX,
            tableY
          );


          ctx.lineTo(
            currentX,
            tableY +
              headerHeight
          );


          ctx.stroke();
        }
      );


      /* ===================================================
         TABLE ROWS
         =================================================== */

      filteredMembers.forEach(
        (member, index) => {

          const rowY =
            tableY +
            headerHeight +
            index *
              rowHeight;


          /* Alternate row background */

          if (
            index % 2 === 1
          ) {

            ctx.fillStyle =
              '#f8f8f8';


            ctx.fillRect(
              tableX,
              rowY,
              tableWidth,
              rowHeight
            );
          }


          ctx.fillStyle =
            '#111111';


          ctx.font =
            '14px Arial, sans-serif';


          /* =================================================
             ROW DATA
             ================================================= */

          const rowData = {

            centerCode:
              getMemberCenterCode(
                member
              ),


            name:
              member.headMember
                ? `${member.name} [HEAD]`
                : member.name ||
                  '-',


            phoneNumber:
              member.phoneNumber ||
              '-',


            centerPlace:
              member.centerPlace ||
              '-',


            amount:
              weeklyCollectionLabel(
                member
              ),


            amountToPay:
              formatCurrency(
                Math.max(
                  Number(member.remainingAmount || 0) -
                    Number(member.creditBalance || 0),
                  0
                )
              ),


            week:
              member.nextPaymentWeek ??
              isoWeekNumber(),

          };


          currentX =
            tableX;


          columns.forEach(
            (column) => {

              const text =
                rowData[
                  column.key
                ];


              drawWrappedText(
                ctx,
                text,
                currentX + 8,
                rowY + 27,
                column.width - 16,
                18,
                2
              );

              ctx.strokeStyle =
                '#777777';


              ctx.lineWidth = 1;


              ctx.beginPath();


              ctx.moveTo(
                currentX,
                rowY
              );


              ctx.lineTo(
                currentX,
                rowY +
                  rowHeight
              );


              ctx.stroke();


              currentX +=
                column.width;
            }
          );

          ctx.beginPath();


          ctx.moveTo(
            tableX +
              tableWidth,
            rowY
          );


          ctx.lineTo(
            tableX +
              tableWidth,
            rowY +
              rowHeight
          );


          ctx.stroke();


          ctx.beginPath();


          ctx.moveTo(
            tableX,
            rowY +
              rowHeight
          );


          ctx.lineTo(
            tableX +
              tableWidth,
            rowY +
              rowHeight
          );


          ctx.stroke();
        }
      );


      /* ===================================================
         OUTER TABLE BORDER
         =================================================== */

      const completeTableHeight =
        headerHeight +
        filteredMembers.length *
          rowHeight;


      ctx.strokeStyle =
        '#555555';


      ctx.lineWidth = 1;


      ctx.strokeRect(
        tableX,
        tableY,
        tableWidth,
        completeTableHeight
      );


      /* ===================================================
         TOTAL
         =================================================== */

      const totalY =
        tableY +
        completeTableHeight +
        35;


      ctx.fillStyle =
        '#111111';


      ctx.font =
        'bold 17px Arial, sans-serif';


      ctx.fillText(
        `Weekday: ${weekdayLabel(
          weekday
        )}    •    Staff: ${selectedStaffName}    •    Members: ${filteredMembers.length}`,
        20,
        totalY
      );


      /* ===================================================
         CREATE PNG
         =================================================== */

      canvas.toBlob(
        (blob) => {

          if (!blob) {

            showError(
              'Unable to create PNG image'
            );

            return;
          }


          const url =
            URL.createObjectURL(
              blob
            );


          const link =
            document.createElement(
              'a'
            );


          link.href =
            url;


          link.download =
            `${weekdayLabel(
              weekday
            )}-${selectedStaffName}-Collection.png`;


          document.body.appendChild(
            link
          );


          link.click();


          document.body.removeChild(
            link
          );


          URL.revokeObjectURL(
            url
          );


          showSuccess(
            'Collection exported as PNG'
          );
        },

        'image/png'
      );


    } catch (err) {

      console.error(
        'PNG export error:',
        err
      );


      showError(
        'Unable to export collection as PNG'
      );
    }
  };


  /* =======================================================
     RETURN
     ======================================================= */

  return (

    <Box
      sx={{
        mt: 4,
      }}
    >

      {/* ===================================================
          TITLE
          =================================================== */}

      <Typography
        variant="h6"
        sx={{
          mb: 2,
        }}
      >
        Weekday Collection
      </Typography>


      {/* ===================================================
          WEEKDAY + STAFF FILTER
          =================================================== */}

      <Stack
        direction={{
          xs: 'column',
          sm: 'row',
        }}
        spacing={2}
        sx={{
          mb: 2,
        }}
        alignItems={{
          sm: 'center',
        }}
        className="no-print"
      >

        {/* =================================================
            WEEKDAY
            ================================================= */}

        <TextField
          select
          size="small"
          label="Weekday"
          value={weekday}
          onChange={(e) =>
            setWeekday(
              e.target.value
            )
          }
          sx={{
            width: {
              xs: '100%',
              sm: 220,
            },
          }}
        >

          <MenuItem value="">
            Select a weekday…
          </MenuItem>


          {WEEKDAY_OPTIONS.map(
            (day) => (

              <MenuItem
                key={day}
                value={day}
              >
                {weekdayLabel(
                  day
                )}
              </MenuItem>

            )
          )}

        </TextField>


                {/* =================================================
            STAFF (admin-only — backend rejects this for
            STAFF/VIEWER, so don't even render it for them)
            ================================================= */}

        {isAdmin && (
        <TextField
          select
          size="small"
          label="Staff"
          value={selectedStaff}
          onChange={(e) =>
            setSelectedStaff(
              e.target.value
            )
          }
          disabled={
            staffLoading
          }
          sx={{
            width: {
              xs: '100%',
              sm: 220,
            },
          }}
        >

          <MenuItem value="">
            All Staff
          </MenuItem>


          {staffList.map(
            (staff) => (

              <MenuItem
                key={staff.id}
                value={String(
                  staff.id
                )}
              >
                {staff.name}
              </MenuItem>

            )
          )}

        </TextField>
        )}

        {/* =================================================
          PRINT
          ================================================= */}

      <Button
        size="small"
        startIcon={<PrintRoundedIcon />}
        onClick={handlePrint}
        disabled={!weekday && !selectedStaff}
        sx={textActionSx}
      >
        Print
      </Button>


      {/* =================================================
          EXPORT PNG
          ================================================= */}

      <Button
        size="small"
        startIcon={<ImageRoundedIcon />}
        onClick={handleExportPng}
        disabled={!weekday && !selectedStaff}
        sx={textActionSx}
      >
        Export PNG
      </Button>
      </Stack> 


      {/* ===================================================
          PRINT-ONLY HEADING
          =================================================== */}

      {weekday && (

        <Box
          sx={{
            display: 'none',

            '@media print': {
              display: 'block',
              mb: 2,
            },
          }}
        >

          <Typography variant="h6">
            Weekday Collection —{' '}
            {weekdayLabel(
              weekday
            )}
          </Typography>


          <Typography variant="body2">
            Staff:{' '}

            {selectedStaff
              ? staffList.find(
                  (staff) =>
                    String(
                      staff.id
                    ) ===
                    String(
                      selectedStaff
                    )
                )?.name ||
                'Selected Staff'

              : 'All Staff'}
          </Typography>


          <Typography variant="body2">
            Printed on{' '}

            {new Date().toLocaleDateString(
              'en-IN'
            )}
          </Typography>

        </Box>
      )}


      {/* ===================================================
          ERROR
          =================================================== */}

      {error && (

        <Alert
          severity="error"
          sx={{
            mb: 2,
          }}
          className="no-print"
        >
          {error}
        </Alert>

      )}


      {/* ===================================================
          NO WEEKDAY SELECTED
          =================================================== */}

      {!weekday ? (

        <Alert
          severity="info"
          className="no-print"
        >
          Select a weekday above to view
          members scheduled for that day.
        </Alert>

      ) : loading ? (

        <LoadingSpinner
          label="Loading members..."
        />

      ) : filteredMembers.length === 0 ? (

        <Alert severity="info">

          {selectedStaff
            ? `No members assigned to the selected staff for ${weekdayLabel(
                weekday
              )}.`

            : `No members are assigned to ${weekdayLabel(
                weekday
              )}.`}

        </Alert>

      ) : (

        <>
          {/* ===============================================
              MEMBER TABLE
              =============================================== */}

          <TableContainer
            component={Paper}
            variant="outlined"
          >

            <Table
              size="small"
              sx={{
                minWidth: 950,
                ...printTableSx,
              }}
            >

              {/* =========================================
                  TABLE HEADER
                  ========================================= */}

              <TableHead>

                <TableRow>

                  {/* CENTER CODE */}

                  <TableCell>
                    Center Code
                  </TableCell>


                  {/* MEMBER NAME */}

                  <TableCell>
                    Member Name
                  </TableCell>


                  {/* PHONE NUMBER */}

                  <TableCell>
                    Phone Number
                  </TableCell>


                  {/* CENTER PLACE */}

                  <TableCell>
                    Center Place
                  </TableCell>


                  {/* WEEKLY AMOUNT */}

                  <TableCell>
                    Amount
                  </TableCell>


                  {/* AMOUNT TO PAY NEXT WEEK (Pending - Credit, floored at 0) */}

                  <TableCell
                    sx={{
                      fontFamily:
                        moneyFontFamily,
                    }}
                  >
                    Pending Amount
                  </TableCell>


                  {/* NEXT PAYMENT WEEK */}

                  <TableCell>
                    Week
                  </TableCell>

                </TableRow>

              </TableHead>


              {/* =========================================
                  TABLE BODY
                  ========================================= */}

              <TableBody>

                {filteredMembers.map(
                  (member) => (

                    <TableRow
                      key={member.id}
                      hover
                    >

                      {/* =================================
                          CENTER CODE
                          ================================= */}

                      <TableCell>
                        {getMemberCenterCode(
                          member
                        )}
                      </TableCell>


                      {/* =================================
                          MEMBER NAME
                          ================================= */}

                      <TableCell>

                        <Box sx={{ display: 'flex', alignItems: 'center' }}>

                          {/* Fixed-width name box so every HEAD chip lines up in a straight column */}
                          <Box
                            component="span"
                            sx={{
                              width: 110,
                              flexShrink: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {member.name || '-'}
                          </Box>

                          {member.headMember && (
                          <Chip
                            icon={<StarRoundedIcon />}
                            size="small"
                            sx={{
                              ml: 1,
                              fontWeight: 600,
                              bgcolor: '#E8D019',
                              color: '#060606',
                              '& .MuiChip-icon': {
                                color: '#060606',
                                mx: '6px',        // equal space left and right of the star
                              },
                              '& .MuiChip-label': {
                                display: 'none',  // remove the empty label's padding
                              },
                            }}
                          />
                        )}

                        </Box>

                      </TableCell>


                      {/* =================================
                          PHONE NUMBER
                          ================================= */}

                      <TableCell>
                        {member.phoneNumber ||
                          '-'}
                      </TableCell>


                      {/* =================================
                          CENTER PLACE
                          ================================= */}

                      <TableCell>
                        {member.centerPlace ||
                          '-'}
                      </TableCell>


                      {/* =================================
                          WEEKLY COLLECTION AMOUNT
                          ================================= */}

                      <TableCell
                        sx={{
                          fontFamily:
                            moneyFontFamily,
                        }}
                      >
                        {weeklyCollectionLabel(
                          member
                        )}
                      </TableCell>


                      {/* =================================
                          AMOUNT TO PAY NEXT WEEK
                          (Pending minus Credit, floored at 0 —
                          any credit balance offsets what's still due)
                          ================================= */}

                      <TableCell
                        sx={{
                          fontFamily:
                            moneyFontFamily,
                          fontWeight: 'bold',
                        }}
                      >
                        {formatCurrency(
                          Math.max(
                            Number(member.remainingAmount || 0) -
                              Number(member.creditBalance || 0),
                            0
                          )
                        )}
                      </TableCell>


                      {/* =================================
                          NEXT PAYMENT WEEK
                          ================================= */}

                      <TableCell>

                        {member.nextPaymentWeek ??
                          isoWeekNumber()}

                      </TableCell>

                    </TableRow>

                  )
                )}

              </TableBody>

            </Table>

          </TableContainer>


          {/* ===============================================
              SUMMARY
              =============================================== */}

          <Typography
            variant="body2"
            sx={{
              mt: 1.5,
            }}
            className="no-print"
          >

            Weekday:{' '}

            <strong>
              {weekdayLabel(
                weekday
              )}
            </strong>


            {' · '}


            Staff:{' '}

            <strong>
              {selectedStaffName}
            </strong>


            {' · '}


            Members:{' '}

            <strong>
              {filteredMembers.length}
            </strong>

          </Typography>

        </>

      )}

    </Box>
  );
}