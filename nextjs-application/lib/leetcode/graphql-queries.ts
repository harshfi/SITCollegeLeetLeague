/**
 * Builds the user profile query. We fetch the current and previous year's
 * submission calendars so the current/max streak can be computed correctly
 * even across the Jan 1 boundary (the calendar is year-scoped on LeetCode).
 */
export function buildUserProfileQuery(currentYear: number): string {
  return `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        ranking
        reputation
        starRating
        userAvatar
        realName
      }
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
      badges {
        id
        name
      }
      calendarCurrent: userCalendar(year: ${currentYear}) {
        streak
        totalActiveDays
        submissionCalendar
      }
      calendarPrev: userCalendar(year: ${currentYear - 1}) {
        submissionCalendar
      }
    }
    allQuestionsCount {
      difficulty
      count
    }
  }
`;
}

export const userContestQuery = `
  query getUserContestRanking($username: String!) {
    userContestRanking(username: $username) {
      attendedContestsCount
      rating
      globalRanking
    }
  }
`;
