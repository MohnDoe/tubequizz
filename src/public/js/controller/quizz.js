angular.module('App')
    .controller('QuizzCtrl', function($rootScope, $state, Api, $timeout) {

        var scope = this;
        scope.loading = true;
        scope.timer = 0; // in MS

        scope.clipOptions = {};

        scope.clips = [{
            title: "MUT MUT ÉCARTEZ-VOUS (Euro Truck Simulator 2)",
            video_id: 'ADUJ87Wxyp4',
            thumbnail: 'https://i.ytimg.com/vi/ADUJ87Wxyp4/mqdefault.jpg',
            start_time: 181285,
            duration: 19172
        }, {
            title: "ET MAINTENANT, FERME TA GUEULE (DayZ)",
            video_id: '80jDpdh4wBc',
            thumbnail: 'https://i.ytimg.com/vi/80jDpdh4wBc/mqdefault.jpg',
            start_time: 466145,
            duration: 18681
        }, {
            title: "J'APPRENDRE LA SURVIE ET LA CONJUGAISON (H1Z1 Battle Royale)",
            video_id: '--6EQeJqf8E',
            thumbnail: 'https://i.ytimg.com/vi/--6EQeJqf8E/mqdefault.jpg',
            start_time: 450593,
            duration: 23160
        }, {
            title: "J'APPRENDRE LA SURVIE ET LA CONJUGAISON (H1Z1 Battle Royale)",
            video_id: '--6EQeJqf8E',
            thumbnail: 'https://i.ytimg.com/vi/--6EQeJqf8E/mqdefault.jpg',
            start_time: 435170,
            duration: 14830
        }, {
            title: "ET J'AI CRAMÉ (Half-Life 2 en COOP)",
            video_id: 'i-ELRMO3vHQ',
            thumbnail: 'https://i.ytimg.com/vi/i-ELRMO3vHQ/mqdefault.jpg',
            start_time: 701483,
            duration: 5000
        }];

        scope.actualPosition = 0;

        scope.videos = [];

        scope.answers = [];

        scope.answersLoaded = false;

        scope.percentTimerLeft = 100;
        scope.potentialPoints = 300;

        scope.initClip = function(position) {
            clip = scope.clips[position];
            scope.clipOptions = clip;
            scope.actualPosition = position;
            $rootScope.$emit('clipChanged', clip);
            if (position != 0) {
                scope.getAnswers();
            }
            scope.resetTimer();
        }



        scope.nextClip = function() {
            actualPosition = scope.actualPosition;
            if (actualPosition + 1 < 5) {
                scope.initClip(actualPosition + 1);
            }
        }

        scope.getVideos = function() {
            Api.call({
                url: 'https://www.googleapis.com/youtube/v3/search?key=AIzaSyBMDrVhmiR2Av3cBfm2_RM7XVvD6udLwuo&channelId=UCYGjxo5ifuhnmvhPvCc3DJQ&part=snippet&order=date&maxResults=50&type=video',
                method: 'GET',
                callback: function(res) {
                    scope.videos = res.items;
                    scope.getAnswers();
                }
            })
        }

        scope.deleteAnswers = function() {
            scope.answers = [];
        }

        scope.randomizeVideos = function() {
            scope.videos = scope.shuffle(scope.videos);
        }

        scope.shuffle = function(a) {
            var j, x, i;
            for (i = a.length; i; i--) {
                j = Math.floor(Math.random() * i);
                x = a[i - 1];
                a[i - 1] = a[j];
                a[j] = x;
            }
            return a;
        }

        scope.getAnswers = function() {
            scope.answersLoaded = false;
            scope.randomizeVideos();
            for (var i = 0; i < 3; i++) {
                scope.answers[i] = scope.videos[i];
            }
            scope.answers[3] = {
                id: {
                    videoId: scope.clips[scope.actualPosition].video_id
                },
                snippet: {
                    title: scope.clips[scope.actualPosition].title,
                    thumbnails: {
                        medium: {
                            url: scope.clips[scope.actualPosition].thumbnail
                        }
                    }
                }
            }
            scope.answers = scope.shuffle(scope.answers);
            scope.answersLoaded = true;
            // console.log(scope.answers);
        }

        scope.answer = function(a) {
            current_clip_id = scope.clips[scope.actualPosition].video_id;
            if (current_clip_id == a) {
                console.log("win");
            } else {
                console.log('lol');
            }
            console.log(300 - scope.timer);
            scope.nextClip();
        }

        $rootScope.$on('clipStarted', function(e) {
            console.log("e:clipStarted");
            scope.startTimer();
        });

        scope.startTimer = function() {
            scope.timer = 0;
            scope.timerTimeout = $timeout(scope.onTimeout, 100);
        }

        scope.resetTimer = function() {
            scope.stopTimer();
            scope.timer = 0;
        }

        scope.onTimeout = function() {
            // TODO : get rid of this
            if (scope.timer >= scope.getChoiceDuraton()) {
                scope.timeIsUp();
                return;
            }
            scope.timer++;
            scope.updateUI();
            scope.timerTimeout = $timeout(scope.onTimeout, 100);
        }

        scope.updatePercentTimerLeft = function() {
            //TODO : make it less frequent
            scope.percentTimerLeft = (scope.getChoiceDuraton() - (scope.timer)) / scope.getChoiceDuraton() * 100;
            // console.log(scope.percentTimerLeft);
        }


        scope.updateUI = function() {
            scope.updatePercentTimerLeft();
            scope.updatePotentialPoints();
        }

        scope.calculatePotentialPoints = function() {
            //TODO : calculate accordingly to the level
            var pointsForThisClip = 300; // TODO : get points for a clip !
            potentialPoints = Math.round(pointsForThisClip - scope.timer * (pointsForThisClip / scope.getChoiceDuraton()));
            return potentialPoints;

        }

        scope.getChoiceDuraton = function() {
            var numberOfLevels = 10; //TODO : get number of levels
            var minChoiceDuration = 10 * 10; //10 sec
            var maxChoiceDuration = 30 * 10; // 30 sec
            var currentLevel = 1; // TODO : get current level

            b = (minChoiceDuration - maxChoiceDuration) / (numberOfLevels - 1);
            c = b * (currentLevel - 1) + maxChoiceDuration;
            // console.log(c);
            return c;
        }

        scope.updatePotentialPoints = function() {
            scope.potentialPoints = scope.calculatePotentialPoints();
        }

        scope.stopTimer = function() {
            $timeout.cancel(scope.timerTimeout);
        }

        scope.timeIsUp = function() {
            scope.stopTimer();
        }

        scope.initClip(0);
        scope.getVideos();


    });