angular.module('App')
    .controller('QuizzCtrl', function($rootScope, $state, Api, $timeout) {

        var scope = this;
        scope.loading = true;
        scope.timer = 0; // in MS

        scope.clipOptions = {};

        scope.level = {
            number: 1,
            clips_count: 5,
            clips_total: 500,
            clips: [{
                title: "EMERIL LEGASSE - Bad Unboxing || 1Up Box [October 2015]",
                video_id: 'v0Je3I23IlE',
                thumbnail: 'https://i.ytimg.com/vi/v0Je3I23IlE/mqdefault.jpg',
                start_time: 172415,
                duration: 11553,
                points: 300
            }, {
                title: "Content Cop - Leafy",
                video_id: 'm4XahX7cuU8',
                thumbnail: 'https://i.ytimg.com/vi/m4XahX7cuU8/mqdefault.jpg',
                start_time: 393549,
                duration: 12004,
                points: 300
            }, {
                title: "I hate swedes - Bad Unboxing Fan Mail",
                video_id: 'hVuSo_rEbrE',
                thumbnail: 'https://i.ytimg.com/vi/hVuSo_rEbrE/mqdefault.jpg',
                start_time: 459250,
                duration: 10816,
                points: 300
            }, {
                title: "Bad Unboxing - Fan Mail (Feat. Garbage)",
                video_id: 'mUXqGSxWpx4',
                thumbnail: 'https://i.ytimg.com/vi/mUXqGSxWpx4/mqdefault.jpg',
                start_time: 112351,
                duration: 1641,
                points: 300
            }, {
                title: "NOOSING MYSELF || Garbage fan mail - Bad Unboxing",
                video_id: 'C1Mu9pmOue4',
                thumbnail: 'https://i.ytimg.com/vi/C1Mu9pmOue4/mqdefault.jpg',
                start_time: 86898,
                duration: 8891,
                points: 300
            }]
        };

        scope.actualPosition = 0;

        scope.videos = [];

        scope.currentAnswers = [];

        scope.currentAnswersLoaded = false;

        scope.percentTimerLeft = 100;
        scope.potentialPoints = 300;

        scope.userScore = 0;

        scope.currentAnswersLoaded = false;

        scope.popup = {
            visible: false,
            options: {
                quizz: {
                    channel: 'wankil',
                    gifs: {
                        correct: 8,
                        wrong: 4
                    },
                    number_levels: 10
                }
            },
            infos: {
                answer: {
                    points: 10,
                    is_correct: true,
                    next: true
                },
                end_game: {

                },
                type: 'answer'
            }
        }


        scope.initClip = function(position) {
            scope.blurAnswers();
            clip = scope.level.clips[position];
            scope.clipOptions = clip;
            scope.actualPosition = position;
            $rootScope.$emit('clipChanged', clip);
            scope.isTimeUp = false;
            if (position != 0) {
                scope.getAnswers();
            }

            scope.resetTimer();
        }



        scope.nextClip = function() {
            actualPosition = scope.actualPosition;
            if (actualPosition + 1 < 5) {
                scope.currentAnswersLoaded = false;
                scope.initClip(actualPosition + 1);
            }
        }

        scope.getVideos = function() {
            Api.call({
                url: 'https://www.googleapis.com/youtube/v3/search?key=AIzaSyBMDrVhmiR2Av3cBfm2_RM7XVvD6udLwuo&channelId=UC4USoIAL9qcsx5nCZV_QRnA&part=snippet&order=date&maxResults=50&type=video',
                method: 'GET',
                callback: function(res) {
                    scope.videos = res.items;
                    scope.getAnswers();
                }
            })
        }

        scope.deleteAnswers = function() {
            scope.currentAnswers = [];
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
            scope.currentAnswersLoaded = false;
            scope.randomizeVideos();
            for (var i = 0; i < 3; i++) {
                scope.currentAnswers[i] = scope.videos[i];
            }
            scope.currentAnswers[3] = {
                id: {
                    videoId: scope.level.clips[scope.actualPosition].video_id
                },
                snippet: {
                    title: scope.level.clips[scope.actualPosition].title,
                    thumbnails: {
                        medium: {
                            url: scope.level.clips[scope.actualPosition].thumbnail
                        }
                    }
                }
            }
            scope.currentAnswers = scope.shuffle(scope.currentAnswers);
            scope.currentAnswersLoaded = true;

            $timeout(scope.unblur, 1000);
            // console.log(scope.currentAnswers);
        }

        scope.unblur = function() {
            scope.unblurAnswers = true;
        }

        scope.blurAnswers = function() {
            scope.unblurAnswers = false;
        }
        scope.answer = function(a) {
            scope.stopTimer();

            current_clip_id = scope.level.clips[scope.actualPosition].video_id;
            if (current_clip_id == a) {
                is_correct = true;
            } else {
                is_correct = false;
            }
            gainedPoints = scope.updateUserScore(is_correct);
            $rootScope.$emit('answerGiven', {
                is_correct: is_correct,
                points: gainedPoints,
                next: true
            });
            // scope.nextClip();
        }

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

        scope.getScore = function() {
            var potentialPoints = scope.calculatePotentialPoints();
            return {
                potentialPoints: potentialPoints,
                wrongPoints: scope.isTimeUp ? -(scope.level.clips[scope.actualPosition].points / 2) : Math.round(-Math.abs(potentialPoints) / 1.5)
            }
        }

        scope.getChoiceDuraton = function() {
            var numberOfLevels = scope.popup.options.quizz.number_levels;
            var minChoiceDuration = 10 * 10; //10 sec
            var maxChoiceDuration = 30 * 10; // 30 sec
            var currentLevel = scope.level.number; // TODO : get current level

            b = (minChoiceDuration - maxChoiceDuration) / (numberOfLevels - 1);
            c = b * (currentLevel - 1) + maxChoiceDuration;
            // console.log(c);
            return c;
        }

        scope.stopTimer = function() {
            $timeout.cancel(scope.timerTimeout);
        }

        scope.timeIsUp = function() {
            scope.isTimeUp = true;
            scope.stopTimer();
            scope.updateUserScore(false);
        }

        scope.updateUserScore = function(is_correct) {
            // console.log("updateUserScore");
            score = scope.getScore();
            // console.log(score);
            if (is_correct) {
                scope.userScore = scope.userScore + score.potentialPoints;
                return score.potentialPoints;
            } else {
                scope.userScore = scope.userScore + score.wrongPoints;
                return score.wrongPoints;
            }
        }

        scope.updatePotentialPoints = function() {
            scope.potentialPoints = scope.calculatePotentialPoints();
        }

        $rootScope.$on('nextClip', function(e) {
            console.log('e:nextClip');
            scope.nextClip();
        });

        $rootScope.$on('clipStarted', function(e) {
            console.log("e:clipStarted");
            scope.startTimer();
        });


        scope.initClip(0);
        scope.getVideos();


    });