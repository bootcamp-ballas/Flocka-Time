var data = {
    userCodeTime: null,
    getUserCodeTime: function () {
        if (auth.uid) {
            firebase.database().ref('/codeTime/users/' + auth.uid).once('value', function (codeTimeSnapshot) {
                var codeTime = codeTimeSnapshot.val();
                data.userCodeTime = codeTime;
                console.log(codeTime);
            });
        }
    },
    createUser: function (emailObj) {
        database.ref("users/" + auth.uid + "/").set(emailObj);
    },
    userStartTime: function () {
        var userId = auth.uid;
        if (auth.uid) {
            var sessionsRef = firebase.database().ref("sessions");
            sessionsRef.push({
                startedAt: firebase.database.ServerValue.TIMESTAMP
            });
            database.ref("codeTime/users/" + userId + "/startedAt").set(firebase.database.ServerValue.TIMESTAMP);
        }
    },
    userStopTime: function() {
      var userId = auth.uid;
      if (auth.uid) {
          var sessionsRef = firebase.database().ref("sessions");
          sessionsRef.push({
            stoppedAt: firebase.database.ServerValue.TIMESTAMP
          });
          database.ref("codeTime/users/" + userId + "/stoppedAt").set(firebase.database.ServerValue.TIMESTAMP);
      }
    },
    timeInstance: "", // Id that represents an instance of user tracking their time 
    timeObject: {}, // Contains all time instances that user has tracked, fetched from Firebase
    totalTime: 0, // Deprecated
    timeLastWeek: new Array(7).fill(0), // Array that contains total time for each day, previous 7 days
    createTimeInstance: function() { // Creates a child on the time node in Firebase, per user
        this.timeInstance = database.ref("time/users/" + auth.uid + "/").push({}).key;

        console.log("Current time instance: " + this.timeInstance);
    },
    updateTime: function(action) { // Updates the time instance with a start or stop timestamp
        var timestamp = moment().format("YYYY-MM-DDTHH:mm:ss");
        var obj = {};

        obj[action] = timestamp;
        
        database.ref("time/users/" + auth.uid + "/" + this.timeInstance + "/").update(obj);
    },
    getTime: function() { // Fetches all time instances from Firebase
        firebase.database().ref('time/users/' + auth.uid + "/")
            .once('value', function (snapshot) {
                data.timeObject = snapshot.val();
                
                notificationService.postNotification('TIME_FETCHED', null);
        });
    },
    calculateTotalTime: function() { // Calculates total time for the previous week and filters per day
        var keys = Object.keys(this.timeObject);
        var dayIndex = 0;
        var i;
        var j;

        this.totalTime = 0;

        if (keys.length === 1) { // If only one time instance exists, avoid executing the loop
            if (this.timeObject.keys[0].stop !== undefined) { // Protect against instance where no start timestamp exists
                dayIndex = this.determineThisWeek(this.timeObject[keys[0]].start);

                if (dayIndex < 7) {
                    this.timeLastWeek[dayIndex] = this.parseTimestamp(this.timeObject[keys[0]].start, this.timeObject[keys[0]].stop);
                }
            }
            else {
                console.log("null time: " + keys[0]);
            }
        }
        else if (keys.length !== 0) {
            for (i = 0, j = keys.length; i < j; i++) {

                if (this.timeObject[keys[i]].stop !== undefined) {
                    dayIndex = this.determineThisWeek(this.timeObject[keys[i]].start);

                    if (dayIndex < 7) {
                        this.timeLastWeek[dayIndex] += this.parseTimestamp(this.timeObject[keys[i]].start, this.timeObject[keys[i]].stop);
                    }
                }
                else {
                    console.log("null time: " + keys[i]);
                }
            }
        }

        this.timeLastWeek = this.timeLastWeek.reverse(); // Make array in ascending days order

        console.log(this.timeLastWeek + " minutes");
    },
    parseTimestamp: function(start, stop) { // Use Moment JS to determine the time between timestamps in minutes
        start = moment(start);
        stop = moment(stop);

        var timeDiff = stop.diff(start, "minutes");

        return timeDiff;
    },
    determineThisWeek: function(timestamp) { // Determines how many days ago the time instance was
        var dayDiff = moment().diff(timestamp, "days");

        return dayDiff;
    }
}