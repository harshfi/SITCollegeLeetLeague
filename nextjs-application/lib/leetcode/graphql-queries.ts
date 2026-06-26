export const userProfileQuery = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        ranking
        reputation
        starRating
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
      userCalendar(year: 2025) {
        streak
        totalActiveDays
        submissionCalendar
      }
    }
    allQuestionsCount {
      difficulty
      count
    }
  }
`;

export const userContestQuery = `
  query getUserContestRanking($username: String!) {
    userContestRanking(username: $username) {
      attendedContestsCount
      rating
      globalRanking
    }
  }
`;
