function timeSince( date ) {
    // doesn't change or get reassigned, so use const
    const seconds = Math.floor( ( new Date() - date ) / 1000 );
    // block level var that changes based on conditions, use let
    let interval = Math.floor( seconds / 31536000 );
  
    if (interval > 1) {
      return `${interval} years`; // you can use string/template literals to make string concat cleaner and easier
    }
    interval = Math.floor( seconds / 2592000 );
    if (interval > 1) {
      return interval + " months";
    }
    interval = Math.floor( seconds / 86400 );
    if (interval > 1) {
      return interval + " days";
    }
    interval = Math.floor( seconds / 3600 );
    if (interval > 1) {
      return interval + " hours";
    }
    interval = Math.floor( seconds / 60 );
    if (interval > 1) {
      return interval + " minutes";
    }
    return Math.floor(seconds) + " seconds";
  }