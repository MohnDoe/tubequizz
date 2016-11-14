angular.module('App', ['templates', 'ui.router', 'ngAnimate', 'ngRoute', 'angularMoment'])

.constant('Config', {
    apiBase: window.location.protocol + "//" + window.location.host + "/api/"
})

.config(function($stateProvider, $urlRouterProvider, $sceProvider, $locationProvider) {

    $sceProvider.enabled(false);
    $locationProvider.html5Mode(true);

    $stateProvider
        .state('quizz', {
            url: '/',
            templateUrl: 'quizz/index.html',
            controller: 'QuizzCtrl as Quizz'
        }).state('404', {
            url: '/404',
            templateUrl: 'errors/404.html'
        });

    $urlRouterProvider.otherwise(function($injector) {
        var $state;
        $state = $injector.get('$state');
        return $state.go('404', null, {
            location: false
        });
    });

})

.run(function($rootScope, $state, $timeout) {

    $rootScope.$state = $state;
    $rootScope.Math = Math;

    $rootScope.safeApply = function safeApply(operation) {
        var phase = this.$root.$$phase;
        if (phase !== '$apply' && phase !== '$digest') {
            this.$apply(operation);
            return;
        }

        if (operation && typeof operation === 'function') {
            operation();
        }
    };

})


//Probably should move this if we get more util shite
.filter('time', function() {
    return function(ms, precise) {

        var totalSeconds = ms / 1000;

        var hours = Math.floor(totalSeconds / 3600);
        var minutes = Math.floor(totalSeconds % 3600 / 60);
        var seconds = Math.floor(totalSeconds % 60);
        var milliseconds = Math.floor(ms % 1000);

        var ret;
        ret = hours ? hours + ":" : "";
        ret += (minutes || hours) || !precise ? (minutes < 10 ? '0' + minutes : minutes) + ":" : "";
        ret += seconds < 10 && !precise ? '0' + seconds : seconds;
        ret += precise ? '.' + (milliseconds < 10 ? '00' + milliseconds : (milliseconds < 100 ? '0' + milliseconds : milliseconds)) : "";

        return ret;
    };
});
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
angular.module('App')
    .directive('player', function(Api, $timeout, $interval) {

        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'directives/player.html',
            scope: {
                //snip:    "=snip",
                clip: "=clip"
            },
            controllerAs: 'Player',
            bindToController: true,
            controller: function($scope, $element, $rootScope) {
                var scope = this;

                var player, restartTimer, loopStarted, initInterval;

                function loop() {
                    console.log('loop started : st = ' + scope.clip.start_time + ' | duration = ' + scope.clip.duration);
                    player.seekTo(scope.clip.start_time / 1000, true);
                    // player.playVideo();
                    $timeout.cancel(restartTimer);
                    restartTimer = $timeout(loop, scope.clip.duration);
                }

                function initYoutube() {
                    // console.log('initYoutube');
                    loopStarted = false;
                    player = new YT.Player('ytplayer', {
                        height: '400',
                        width: '100%',
                        playerVars: {
                            controls: 0,
                            //autohide:       0,
                            autoplay: 1,
                            disablekb: 1,
                            enablejsapi: 1,
                            fs: 0,
                            modestbranding: 1, //only works with controls enabled
                            playsinline: 1,
                            showinfo: 0,
                            rel: 0,
                            theme: 'dark',
                        },
                        videoId: scope.clip.video_id,
                        events: {
                            'onReady': function(e) {
                                e.target.setVolume(75);
                                console.log('e:ytplayer:onReady');
                                //Scale player
                                var containerWidth = $element[0].clientWidth;
                                player.getIframe().width = containerWidth;
                                player.getIframe().height = containerWidth * 0.5625;

                                player.seekTo(scope.clip.start_time / 1000, true);
                                //player.playVideo();
                            },
                            'onStateChange': function() {
                                if (player.getPlayerState() == 1 && !loopStarted) {
                                    $rootScope.$emit('clipStarted');
                                    loopStarted = true;
                                    loop();
                                }
                            }
                        }
                    });
                }

                initInterval = $interval(function() {
                    if (YT && YT.Player) {
                        $interval.cancel(initInterval);
                        initYoutube();
                    }
                }, 25);

                function changeClip(clip) {
                    player.destroy();
                    scope.clip = clip;
                    // console.log(scope.clip);
                    initYoutube();
                }

                $scope.$on('$destroy', function() {
                    console.log('e:$destroy');

                    player.pauseVideo();
                    $timeout.cancel(restartTimer);
                    $interval.cancel(initInterval);
                })

                $rootScope.$on('answerGiven', function(e) {
                    player.pauseVideo();
                })

                $rootScope.$on('clipChanged', function(e, c) {
                    changeClip(c)
                });

            }
        };

    });
angular.module('App')
    .directive('resultpopup', function(Api, $timeout, $interval) {

        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'directives/resultpopup.html',
            scope: {
                //snip:    "=snip",
                options: "=options",
                visible: "=visible",
                infos: "=infos"
            },
            controllerAs: 'ResultPopup',
            bindToController: true,
            controller: function($scope, $element, $rootScope) {
                var scope = this;

                scope.getURLGif = function() {
                    return './img/gif/' + scope.options.quizz.channel + '/' + (scope.infos.answer.is_correct ? 'correct' : 'wrong') + '/' + Math.floor(Math.random() * (scope.infos.answer.is_correct ? scope.options.quizz.gifs.correct : scope.options.quizz.gifs.wrong) + 1) + ".gif"
                }

                scope.initURLGif = function() {
                    scope.urlGIF = scope.getURLGif();
                }

                scope.nextClip = function() {
                    scope.initURLGif();
                    $rootScope.$emit('nextClip');
                }

                scope.show = function() {
                    scope.visible = true;
                }

                $rootScope.$on('nextClip', function(e) {
                    scope.visible = false;
                });

                $rootScope.$on('answerGiven', function(e, infos) {
                    scope.show();
                    scope.infos.answer = infos;
                    scope.initURLGif();

                })
            }
        };

    });
angular.module('App').service('Api', function($http, $q, Config, $timeout) {


    /**
     * Perform an API call.
     * @param options {url, params, data, callback, method, errorHandler (should return true), timeout in MS, blockUI}
     */
    this.call = function(options) {

        var options = angular.extend({
            url: null,
            method: 'GET',
            params: null,
            data: null,
            callback: null,
            timeout: 30000,
            errorHandler: null,
            blockUI: true,
        }, options);

        var canceler = $q.defer();
        var cancelTimeout = options.timeout ? $timeout(canceler.resolve, options.timeout) : null;


        var url = options.url.indexOf('http') == 0 ? options.url : Config.apiBase + options.url;

        $http({
            url: url,
            method: options.method,
            params: options.params,
            data: options.data,
            timeout: canceler.promise
        }).success(function(data) {
            $timeout.cancel(cancelTimeout);
            if (typeof options.callback == 'function') {
                options.callback(data);
            }
        }).error(function(message, status) {
            $timeout.cancel(cancelTimeout);

            if (typeof options.errorHandler == 'function' && options.errorHandler(message, status)) {
                //Error was handled by the custom error handler
                return;
            }

            if (!status) {
                console.log("Error without status; request aborted?");
                return;
            }

        });

        return {
            cancel: function() {
                canceler.resolve();
            }
        };

    };

});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbnRyb2xsZXIvcXVpenouanMiLCJkaXJlY3RpdmVzL3BsYXllci5qcyIsImRpcmVjdGl2ZXMvcmVzdWx0cG9wdXAuanMiLCJzZXJ2aWNlL2FwaS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdBcHAnLCBbJ3RlbXBsYXRlcycsICd1aS5yb3V0ZXInLCAnbmdBbmltYXRlJywgJ25nUm91dGUnLCAnYW5ndWxhck1vbWVudCddKVxyXG5cclxuLmNvbnN0YW50KCdDb25maWcnLCB7XHJcbiAgICBhcGlCYXNlOiB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyB3aW5kb3cubG9jYXRpb24uaG9zdCArIFwiL2FwaS9cIlxyXG59KVxyXG5cclxuLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyLCAkc2NlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XHJcblxyXG4gICAgJHNjZVByb3ZpZGVyLmVuYWJsZWQoZmFsc2UpO1xyXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xyXG5cclxuICAgICRzdGF0ZVByb3ZpZGVyXHJcbiAgICAgICAgLnN0YXRlKCdxdWl6eicsIHtcclxuICAgICAgICAgICAgdXJsOiAnLycsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAncXVpenovaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdRdWl6ekN0cmwgYXMgUXVpenonXHJcbiAgICAgICAgfSkuc3RhdGUoJzQwNCcsIHtcclxuICAgICAgICAgICAgdXJsOiAnLzQwNCcsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnZXJyb3JzLzQwNC5odG1sJ1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoZnVuY3Rpb24oJGluamVjdG9yKSB7XHJcbiAgICAgICAgdmFyICRzdGF0ZTtcclxuICAgICAgICAkc3RhdGUgPSAkaW5qZWN0b3IuZ2V0KCckc3RhdGUnKTtcclxuICAgICAgICByZXR1cm4gJHN0YXRlLmdvKCc0MDQnLCBudWxsLCB7XHJcbiAgICAgICAgICAgIGxvY2F0aW9uOiBmYWxzZVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG59KVxyXG5cclxuLnJ1bihmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsICR0aW1lb3V0KSB7XHJcblxyXG4gICAgJHJvb3RTY29wZS4kc3RhdGUgPSAkc3RhdGU7XHJcbiAgICAkcm9vdFNjb3BlLk1hdGggPSBNYXRoO1xyXG5cclxuICAgICRyb290U2NvcGUuc2FmZUFwcGx5ID0gZnVuY3Rpb24gc2FmZUFwcGx5KG9wZXJhdGlvbikge1xyXG4gICAgICAgIHZhciBwaGFzZSA9IHRoaXMuJHJvb3QuJCRwaGFzZTtcclxuICAgICAgICBpZiAocGhhc2UgIT09ICckYXBwbHknICYmIHBoYXNlICE9PSAnJGRpZ2VzdCcpIHtcclxuICAgICAgICAgICAgdGhpcy4kYXBwbHkob3BlcmF0aW9uKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wZXJhdGlvbiAmJiB0eXBlb2Ygb3BlcmF0aW9uID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIG9wZXJhdGlvbigpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG59KVxyXG5cclxuXHJcbi8vUHJvYmFibHkgc2hvdWxkIG1vdmUgdGhpcyBpZiB3ZSBnZXQgbW9yZSB1dGlsIHNoaXRlXHJcbi5maWx0ZXIoJ3RpbWUnLCBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbihtcywgcHJlY2lzZSkge1xyXG5cclxuICAgICAgICB2YXIgdG90YWxTZWNvbmRzID0gbXMgLyAxMDAwO1xyXG5cclxuICAgICAgICB2YXIgaG91cnMgPSBNYXRoLmZsb29yKHRvdGFsU2Vjb25kcyAvIDM2MDApO1xyXG4gICAgICAgIHZhciBtaW51dGVzID0gTWF0aC5mbG9vcih0b3RhbFNlY29uZHMgJSAzNjAwIC8gNjApO1xyXG4gICAgICAgIHZhciBzZWNvbmRzID0gTWF0aC5mbG9vcih0b3RhbFNlY29uZHMgJSA2MCk7XHJcbiAgICAgICAgdmFyIG1pbGxpc2Vjb25kcyA9IE1hdGguZmxvb3IobXMgJSAxMDAwKTtcclxuXHJcbiAgICAgICAgdmFyIHJldDtcclxuICAgICAgICByZXQgPSBob3VycyA/IGhvdXJzICsgXCI6XCIgOiBcIlwiO1xyXG4gICAgICAgIHJldCArPSAobWludXRlcyB8fCBob3VycykgfHwgIXByZWNpc2UgPyAobWludXRlcyA8IDEwID8gJzAnICsgbWludXRlcyA6IG1pbnV0ZXMpICsgXCI6XCIgOiBcIlwiO1xyXG4gICAgICAgIHJldCArPSBzZWNvbmRzIDwgMTAgJiYgIXByZWNpc2UgPyAnMCcgKyBzZWNvbmRzIDogc2Vjb25kcztcclxuICAgICAgICByZXQgKz0gcHJlY2lzZSA/ICcuJyArIChtaWxsaXNlY29uZHMgPCAxMCA/ICcwMCcgKyBtaWxsaXNlY29uZHMgOiAobWlsbGlzZWNvbmRzIDwgMTAwID8gJzAnICsgbWlsbGlzZWNvbmRzIDogbWlsbGlzZWNvbmRzKSkgOiBcIlwiO1xyXG5cclxuICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgfTtcclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcbiAgICAuY29udHJvbGxlcignUXVpenpDdHJsJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgJHN0YXRlLCBBcGksICR0aW1lb3V0KSB7XHJcblxyXG4gICAgICAgIHZhciBzY29wZSA9IHRoaXM7XHJcbiAgICAgICAgc2NvcGUubG9hZGluZyA9IHRydWU7XHJcbiAgICAgICAgc2NvcGUudGltZXIgPSAwOyAvLyBpbiBNU1xyXG5cclxuICAgICAgICBzY29wZS5jbGlwT3B0aW9ucyA9IHt9O1xyXG5cclxuICAgICAgICBzY29wZS5sZXZlbCA9IHtcclxuICAgICAgICAgICAgbnVtYmVyOiAxLFxyXG4gICAgICAgICAgICBjbGlwc19jb3VudDogNSxcclxuICAgICAgICAgICAgY2xpcHNfdG90YWw6IDUwMCxcclxuICAgICAgICAgICAgY2xpcHM6IFt7XHJcbiAgICAgICAgICAgICAgICB0aXRsZTogXCJFTUVSSUwgTEVHQVNTRSAtIEJhZCBVbmJveGluZyB8fCAxVXAgQm94IFtPY3RvYmVyIDIwMTVdXCIsXHJcbiAgICAgICAgICAgICAgICB2aWRlb19pZDogJ3YwSmUzSTIzSWxFJyxcclxuICAgICAgICAgICAgICAgIHRodW1ibmFpbDogJ2h0dHBzOi8vaS55dGltZy5jb20vdmkvdjBKZTNJMjNJbEUvbXFkZWZhdWx0LmpwZycsXHJcbiAgICAgICAgICAgICAgICBzdGFydF90aW1lOiAxNzI0MTUsXHJcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTE1NTMsXHJcbiAgICAgICAgICAgICAgICBwb2ludHM6IDMwMFxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICB0aXRsZTogXCJDb250ZW50IENvcCAtIExlYWZ5XCIsXHJcbiAgICAgICAgICAgICAgICB2aWRlb19pZDogJ200WGFoWDdjdVU4JyxcclxuICAgICAgICAgICAgICAgIHRodW1ibmFpbDogJ2h0dHBzOi8vaS55dGltZy5jb20vdmkvbTRYYWhYN2N1VTgvbXFkZWZhdWx0LmpwZycsXHJcbiAgICAgICAgICAgICAgICBzdGFydF90aW1lOiAzOTM1NDksXHJcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTIwMDQsXHJcbiAgICAgICAgICAgICAgICBwb2ludHM6IDMwMFxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICB0aXRsZTogXCJJIGhhdGUgc3dlZGVzIC0gQmFkIFVuYm94aW5nIEZhbiBNYWlsXCIsXHJcbiAgICAgICAgICAgICAgICB2aWRlb19pZDogJ2hWdVNvX3JFYnJFJyxcclxuICAgICAgICAgICAgICAgIHRodW1ibmFpbDogJ2h0dHBzOi8vaS55dGltZy5jb20vdmkvaFZ1U29fckVickUvbXFkZWZhdWx0LmpwZycsXHJcbiAgICAgICAgICAgICAgICBzdGFydF90aW1lOiA0NTkyNTAsXHJcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTA4MTYsXHJcbiAgICAgICAgICAgICAgICBwb2ludHM6IDMwMFxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICB0aXRsZTogXCJCYWQgVW5ib3hpbmcgLSBGYW4gTWFpbCAoRmVhdC4gR2FyYmFnZSlcIixcclxuICAgICAgICAgICAgICAgIHZpZGVvX2lkOiAnbVVYcUdTeFdweDQnLFxyXG4gICAgICAgICAgICAgICAgdGh1bWJuYWlsOiAnaHR0cHM6Ly9pLnl0aW1nLmNvbS92aS9tVVhxR1N4V3B4NC9tcWRlZmF1bHQuanBnJyxcclxuICAgICAgICAgICAgICAgIHN0YXJ0X3RpbWU6IDExMjM1MSxcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxNjQxLFxyXG4gICAgICAgICAgICAgICAgcG9pbnRzOiAzMDBcclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgdGl0bGU6IFwiTk9PU0lORyBNWVNFTEYgfHwgR2FyYmFnZSBmYW4gbWFpbCAtIEJhZCBVbmJveGluZ1wiLFxyXG4gICAgICAgICAgICAgICAgdmlkZW9faWQ6ICdDMU11OXBtT3VlNCcsXHJcbiAgICAgICAgICAgICAgICB0aHVtYm5haWw6ICdodHRwczovL2kueXRpbWcuY29tL3ZpL0MxTXU5cG1PdWU0L21xZGVmYXVsdC5qcGcnLFxyXG4gICAgICAgICAgICAgICAgc3RhcnRfdGltZTogODY4OTgsXHJcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogODg5MSxcclxuICAgICAgICAgICAgICAgIHBvaW50czogMzAwXHJcbiAgICAgICAgICAgIH1dXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgc2NvcGUuYWN0dWFsUG9zaXRpb24gPSAwO1xyXG5cclxuICAgICAgICBzY29wZS52aWRlb3MgPSBbXTtcclxuXHJcbiAgICAgICAgc2NvcGUuY3VycmVudEFuc3dlcnMgPSBbXTtcclxuXHJcbiAgICAgICAgc2NvcGUuY3VycmVudEFuc3dlcnNMb2FkZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgc2NvcGUucGVyY2VudFRpbWVyTGVmdCA9IDEwMDtcclxuICAgICAgICBzY29wZS5wb3RlbnRpYWxQb2ludHMgPSAzMDA7XHJcblxyXG4gICAgICAgIHNjb3BlLnVzZXJTY29yZSA9IDA7XHJcblxyXG4gICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzTG9hZGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgIHNjb3BlLnBvcHVwID0ge1xyXG4gICAgICAgICAgICB2aXNpYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgcXVpeno6IHtcclxuICAgICAgICAgICAgICAgICAgICBjaGFubmVsOiAnd2Fua2lsJyxcclxuICAgICAgICAgICAgICAgICAgICBnaWZzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvcnJlY3Q6IDgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyb25nOiA0XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBudW1iZXJfbGV2ZWxzOiAxMFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBpbmZvczoge1xyXG4gICAgICAgICAgICAgICAgYW5zd2VyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9pbnRzOiAxMCxcclxuICAgICAgICAgICAgICAgICAgICBpc19jb3JyZWN0OiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHQ6IHRydWVcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBlbmRfZ2FtZToge1xyXG5cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnYW5zd2VyJ1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgc2NvcGUuaW5pdENsaXAgPSBmdW5jdGlvbihwb3NpdGlvbikge1xyXG4gICAgICAgICAgICBzY29wZS5ibHVyQW5zd2VycygpO1xyXG4gICAgICAgICAgICBjbGlwID0gc2NvcGUubGV2ZWwuY2xpcHNbcG9zaXRpb25dO1xyXG4gICAgICAgICAgICBzY29wZS5jbGlwT3B0aW9ucyA9IGNsaXA7XHJcbiAgICAgICAgICAgIHNjb3BlLmFjdHVhbFBvc2l0aW9uID0gcG9zaXRpb247XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ2NsaXBDaGFuZ2VkJywgY2xpcCk7XHJcbiAgICAgICAgICAgIHNjb3BlLmlzVGltZVVwID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbiAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5nZXRBbnN3ZXJzKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHNjb3BlLnJlc2V0VGltZXIoKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgc2NvcGUubmV4dENsaXAgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgYWN0dWFsUG9zaXRpb24gPSBzY29wZS5hY3R1YWxQb3NpdGlvbjtcclxuICAgICAgICAgICAgaWYgKGFjdHVhbFBvc2l0aW9uICsgMSA8IDUpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzTG9hZGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5pbml0Q2xpcChhY3R1YWxQb3NpdGlvbiArIDEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5nZXRWaWRlb3MgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgQXBpLmNhbGwoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20veW91dHViZS92My9zZWFyY2g/a2V5PUFJemFTeUJNRHJWaG1pUjJBdjNjQmZtMl9STTdYVnZENnVkTHd1byZjaGFubmVsSWQ9VUM0VVNvSUFMOXFjc3g1bkNaVl9RUm5BJnBhcnQ9c25pcHBldCZvcmRlcj1kYXRlJm1heFJlc3VsdHM9NTAmdHlwZT12aWRlbycsXHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKHJlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnZpZGVvcyA9IHJlcy5pdGVtcztcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5nZXRBbnN3ZXJzKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5kZWxldGVBbnN3ZXJzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzID0gW107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5yYW5kb21pemVWaWRlb3MgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUudmlkZW9zID0gc2NvcGUuc2h1ZmZsZShzY29wZS52aWRlb3MpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUuc2h1ZmZsZSA9IGZ1bmN0aW9uKGEpIHtcclxuICAgICAgICAgICAgdmFyIGosIHgsIGk7XHJcbiAgICAgICAgICAgIGZvciAoaSA9IGEubGVuZ3RoOyBpOyBpLS0pIHtcclxuICAgICAgICAgICAgICAgIGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBpKTtcclxuICAgICAgICAgICAgICAgIHggPSBhW2kgLSAxXTtcclxuICAgICAgICAgICAgICAgIGFbaSAtIDFdID0gYVtqXTtcclxuICAgICAgICAgICAgICAgIGFbal0gPSB4O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBhO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUuZ2V0QW5zd2VycyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS5jdXJyZW50QW5zd2Vyc0xvYWRlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBzY29wZS5yYW5kb21pemVWaWRlb3MoKTtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAzOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzW2ldID0gc2NvcGUudmlkZW9zW2ldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzWzNdID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHtcclxuICAgICAgICAgICAgICAgICAgICB2aWRlb0lkOiBzY29wZS5sZXZlbC5jbGlwc1tzY29wZS5hY3R1YWxQb3NpdGlvbl0udmlkZW9faWRcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBzbmlwcGV0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6IHNjb3BlLmxldmVsLmNsaXBzW3Njb3BlLmFjdHVhbFBvc2l0aW9uXS50aXRsZSxcclxuICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lZGl1bToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBzY29wZS5sZXZlbC5jbGlwc1tzY29wZS5hY3R1YWxQb3NpdGlvbl0udGh1bWJuYWlsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2NvcGUuY3VycmVudEFuc3dlcnMgPSBzY29wZS5zaHVmZmxlKHNjb3BlLmN1cnJlbnRBbnN3ZXJzKTtcclxuICAgICAgICAgICAgc2NvcGUuY3VycmVudEFuc3dlcnNMb2FkZWQgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgJHRpbWVvdXQoc2NvcGUudW5ibHVyLCAxMDAwKTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coc2NvcGUuY3VycmVudEFuc3dlcnMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUudW5ibHVyID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnVuYmx1ckFuc3dlcnMgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUuYmx1ckFuc3dlcnMgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUudW5ibHVyQW5zd2VycyA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzY29wZS5hbnN3ZXIgPSBmdW5jdGlvbihhKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnN0b3BUaW1lcigpO1xyXG5cclxuICAgICAgICAgICAgY3VycmVudF9jbGlwX2lkID0gc2NvcGUubGV2ZWwuY2xpcHNbc2NvcGUuYWN0dWFsUG9zaXRpb25dLnZpZGVvX2lkO1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudF9jbGlwX2lkID09IGEpIHtcclxuICAgICAgICAgICAgICAgIGlzX2NvcnJlY3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaXNfY29ycmVjdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGdhaW5lZFBvaW50cyA9IHNjb3BlLnVwZGF0ZVVzZXJTY29yZShpc19jb3JyZWN0KTtcclxuICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnYW5zd2VyR2l2ZW4nLCB7XHJcbiAgICAgICAgICAgICAgICBpc19jb3JyZWN0OiBpc19jb3JyZWN0LFxyXG4gICAgICAgICAgICAgICAgcG9pbnRzOiBnYWluZWRQb2ludHMsXHJcbiAgICAgICAgICAgICAgICBuZXh0OiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyBzY29wZS5uZXh0Q2xpcCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUuc3RhcnRUaW1lciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS50aW1lciA9IDA7XHJcbiAgICAgICAgICAgIHNjb3BlLnRpbWVyVGltZW91dCA9ICR0aW1lb3V0KHNjb3BlLm9uVGltZW91dCwgMTAwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLnJlc2V0VGltZXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUuc3RvcFRpbWVyKCk7XHJcbiAgICAgICAgICAgIHNjb3BlLnRpbWVyID0gMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLm9uVGltZW91dCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvLyBUT0RPIDogZ2V0IHJpZCBvZiB0aGlzXHJcbiAgICAgICAgICAgIGlmIChzY29wZS50aW1lciA+PSBzY29wZS5nZXRDaG9pY2VEdXJhdG9uKCkpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVJc1VwKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2NvcGUudGltZXIrKztcclxuICAgICAgICAgICAgc2NvcGUudXBkYXRlVUkoKTtcclxuICAgICAgICAgICAgc2NvcGUudGltZXJUaW1lb3V0ID0gJHRpbWVvdXQoc2NvcGUub25UaW1lb3V0LCAxMDApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUudXBkYXRlUGVyY2VudFRpbWVyTGVmdCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvL1RPRE8gOiBtYWtlIGl0IGxlc3MgZnJlcXVlbnRcclxuICAgICAgICAgICAgc2NvcGUucGVyY2VudFRpbWVyTGVmdCA9IChzY29wZS5nZXRDaG9pY2VEdXJhdG9uKCkgLSAoc2NvcGUudGltZXIpKSAvIHNjb3BlLmdldENob2ljZUR1cmF0b24oKSAqIDEwMDtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coc2NvcGUucGVyY2VudFRpbWVyTGVmdCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgc2NvcGUudXBkYXRlVUkgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUudXBkYXRlUGVyY2VudFRpbWVyTGVmdCgpO1xyXG4gICAgICAgICAgICBzY29wZS51cGRhdGVQb3RlbnRpYWxQb2ludHMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmNhbGN1bGF0ZVBvdGVudGlhbFBvaW50cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvL1RPRE8gOiBjYWxjdWxhdGUgYWNjb3JkaW5nbHkgdG8gdGhlIGxldmVsXHJcbiAgICAgICAgICAgIHZhciBwb2ludHNGb3JUaGlzQ2xpcCA9IDMwMDsgLy8gVE9ETyA6IGdldCBwb2ludHMgZm9yIGEgY2xpcCAhXHJcbiAgICAgICAgICAgIHBvdGVudGlhbFBvaW50cyA9IE1hdGgucm91bmQocG9pbnRzRm9yVGhpc0NsaXAgLSBzY29wZS50aW1lciAqIChwb2ludHNGb3JUaGlzQ2xpcCAvIHNjb3BlLmdldENob2ljZUR1cmF0b24oKSkpO1xyXG4gICAgICAgICAgICByZXR1cm4gcG90ZW50aWFsUG9pbnRzO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmdldFNjb3JlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBwb3RlbnRpYWxQb2ludHMgPSBzY29wZS5jYWxjdWxhdGVQb3RlbnRpYWxQb2ludHMoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHBvdGVudGlhbFBvaW50czogcG90ZW50aWFsUG9pbnRzLFxyXG4gICAgICAgICAgICAgICAgd3JvbmdQb2ludHM6IHNjb3BlLmlzVGltZVVwID8gLShzY29wZS5sZXZlbC5jbGlwc1tzY29wZS5hY3R1YWxQb3NpdGlvbl0ucG9pbnRzIC8gMikgOiBNYXRoLnJvdW5kKC1NYXRoLmFicyhwb3RlbnRpYWxQb2ludHMpIC8gMS41KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5nZXRDaG9pY2VEdXJhdG9uID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBudW1iZXJPZkxldmVscyA9IHNjb3BlLnBvcHVwLm9wdGlvbnMucXVpenoubnVtYmVyX2xldmVscztcclxuICAgICAgICAgICAgdmFyIG1pbkNob2ljZUR1cmF0aW9uID0gMTAgKiAxMDsgLy8xMCBzZWNcclxuICAgICAgICAgICAgdmFyIG1heENob2ljZUR1cmF0aW9uID0gMzAgKiAxMDsgLy8gMzAgc2VjXHJcbiAgICAgICAgICAgIHZhciBjdXJyZW50TGV2ZWwgPSBzY29wZS5sZXZlbC5udW1iZXI7IC8vIFRPRE8gOiBnZXQgY3VycmVudCBsZXZlbFxyXG5cclxuICAgICAgICAgICAgYiA9IChtaW5DaG9pY2VEdXJhdGlvbiAtIG1heENob2ljZUR1cmF0aW9uKSAvIChudW1iZXJPZkxldmVscyAtIDEpO1xyXG4gICAgICAgICAgICBjID0gYiAqIChjdXJyZW50TGV2ZWwgLSAxKSArIG1heENob2ljZUR1cmF0aW9uO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhjKTtcclxuICAgICAgICAgICAgcmV0dXJuIGM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5zdG9wVGltZXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHNjb3BlLnRpbWVyVGltZW91dCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS50aW1lSXNVcCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS5pc1RpbWVVcCA9IHRydWU7XHJcbiAgICAgICAgICAgIHNjb3BlLnN0b3BUaW1lcigpO1xyXG4gICAgICAgICAgICBzY29wZS51cGRhdGVVc2VyU2NvcmUoZmFsc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUudXBkYXRlVXNlclNjb3JlID0gZnVuY3Rpb24oaXNfY29ycmVjdCkge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcInVwZGF0ZVVzZXJTY29yZVwiKTtcclxuICAgICAgICAgICAgc2NvcmUgPSBzY29wZS5nZXRTY29yZSgpO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzY29yZSk7XHJcbiAgICAgICAgICAgIGlmIChpc19jb3JyZWN0KSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyU2NvcmUgPSBzY29wZS51c2VyU2NvcmUgKyBzY29yZS5wb3RlbnRpYWxQb2ludHM7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2NvcmUucG90ZW50aWFsUG9pbnRzO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUudXNlclNjb3JlID0gc2NvcGUudXNlclNjb3JlICsgc2NvcmUud3JvbmdQb2ludHM7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2NvcmUud3JvbmdQb2ludHM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLnVwZGF0ZVBvdGVudGlhbFBvaW50cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS5wb3RlbnRpYWxQb2ludHMgPSBzY29wZS5jYWxjdWxhdGVQb3RlbnRpYWxQb2ludHMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICRyb290U2NvcGUuJG9uKCduZXh0Q2xpcCcsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ2U6bmV4dENsaXAnKTtcclxuICAgICAgICAgICAgc2NvcGUubmV4dENsaXAoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHJvb3RTY29wZS4kb24oJ2NsaXBTdGFydGVkJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImU6Y2xpcFN0YXJ0ZWRcIik7XHJcbiAgICAgICAgICAgIHNjb3BlLnN0YXJ0VGltZXIoKTtcclxuICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgICAgIHNjb3BlLmluaXRDbGlwKDApO1xyXG4gICAgICAgIHNjb3BlLmdldFZpZGVvcygpO1xyXG5cclxuXHJcbiAgICB9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuICAgIC5kaXJlY3RpdmUoJ3BsYXllcicsIGZ1bmN0aW9uKEFwaSwgJHRpbWVvdXQsICRpbnRlcnZhbCkge1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2RpcmVjdGl2ZXMvcGxheWVyLmh0bWwnLFxyXG4gICAgICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICAgICAgLy9zbmlwOiAgICBcIj1zbmlwXCIsXHJcbiAgICAgICAgICAgICAgICBjbGlwOiBcIj1jbGlwXCJcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAnUGxheWVyJyxcclxuICAgICAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSxcclxuICAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCAkZWxlbWVudCwgJHJvb3RTY29wZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gdGhpcztcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgcGxheWVyLCByZXN0YXJ0VGltZXIsIGxvb3BTdGFydGVkLCBpbml0SW50ZXJ2YWw7XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gbG9vcCgpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbG9vcCBzdGFydGVkIDogc3QgPSAnICsgc2NvcGUuY2xpcC5zdGFydF90aW1lICsgJyB8IGR1cmF0aW9uID0gJyArIHNjb3BlLmNsaXAuZHVyYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5zZWVrVG8oc2NvcGUuY2xpcC5zdGFydF90aW1lIC8gMTAwMCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gcGxheWVyLnBsYXlWaWRlbygpO1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChyZXN0YXJ0VGltZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3RhcnRUaW1lciA9ICR0aW1lb3V0KGxvb3AsIHNjb3BlLmNsaXAuZHVyYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluaXRZb3V0dWJlKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdpbml0WW91dHViZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvb3BTdGFydGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyID0gbmV3IFlULlBsYXllcigneXRwbGF5ZXInLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogJzQwMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiAnMTAwJScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYXllclZhcnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xzOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9hdXRvaGlkZTogICAgICAgMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9wbGF5OiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWtiOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlanNhcGk6IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmczogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGVzdGJyYW5kaW5nOiAxLCAvL29ubHkgd29ya3Mgd2l0aCBjb250cm9scyBlbmFibGVkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGF5c2lubGluZTogMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNob3dpbmZvOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVsOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlbWU6ICdkYXJrJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9JZDogc2NvcGUuY2xpcC52aWRlb19pZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnb25SZWFkeSc6IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC5zZXRWb2x1bWUoNzUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlOnl0cGxheWVyOm9uUmVhZHknKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL1NjYWxlIHBsYXllclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb250YWluZXJXaWR0aCA9ICRlbGVtZW50WzBdLmNsaWVudFdpZHRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYXllci5nZXRJZnJhbWUoKS53aWR0aCA9IGNvbnRhaW5lcldpZHRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYXllci5nZXRJZnJhbWUoKS5oZWlnaHQgPSBjb250YWluZXJXaWR0aCAqIDAuNTYyNTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxheWVyLnNlZWtUbyhzY29wZS5jbGlwLnN0YXJ0X3RpbWUgLyAxMDAwLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL3BsYXllci5wbGF5VmlkZW8oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnb25TdGF0ZUNoYW5nZSc6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwbGF5ZXIuZ2V0UGxheWVyU3RhdGUoKSA9PSAxICYmICFsb29wU3RhcnRlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCdjbGlwU3RhcnRlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb29wU3RhcnRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpbml0SW50ZXJ2YWwgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKFlUICYmIFlULlBsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKGluaXRJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluaXRZb3V0dWJlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSwgMjUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNoYW5nZUNsaXAoY2xpcCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5kZXN0cm95KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuY2xpcCA9IGNsaXA7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coc2NvcGUuY2xpcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5pdFlvdXR1YmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlOiRkZXN0cm95Jyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5wYXVzZVZpZGVvKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHJlc3RhcnRUaW1lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbChpbml0SW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignYW5zd2VyR2l2ZW4nLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyLnBhdXNlVmlkZW8oKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJ2NsaXBDaGFuZ2VkJywgZnVuY3Rpb24oZSwgYykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZUNsaXAoYylcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgfSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcbiAgICAuZGlyZWN0aXZlKCdyZXN1bHRwb3B1cCcsIGZ1bmN0aW9uKEFwaSwgJHRpbWVvdXQsICRpbnRlcnZhbCkge1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2RpcmVjdGl2ZXMvcmVzdWx0cG9wdXAuaHRtbCcsXHJcbiAgICAgICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICAgICAgICAvL3NuaXA6ICAgIFwiPXNuaXBcIixcclxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IFwiPW9wdGlvbnNcIixcclxuICAgICAgICAgICAgICAgIHZpc2libGU6IFwiPXZpc2libGVcIixcclxuICAgICAgICAgICAgICAgIGluZm9zOiBcIj1pbmZvc1wiXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ1Jlc3VsdFBvcHVwJyxcclxuICAgICAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSxcclxuICAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCAkZWxlbWVudCwgJHJvb3RTY29wZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gdGhpcztcclxuXHJcbiAgICAgICAgICAgICAgICBzY29wZS5nZXRVUkxHaWYgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJy4vaW1nL2dpZi8nICsgc2NvcGUub3B0aW9ucy5xdWl6ei5jaGFubmVsICsgJy8nICsgKHNjb3BlLmluZm9zLmFuc3dlci5pc19jb3JyZWN0ID8gJ2NvcnJlY3QnIDogJ3dyb25nJykgKyAnLycgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoc2NvcGUuaW5mb3MuYW5zd2VyLmlzX2NvcnJlY3QgPyBzY29wZS5vcHRpb25zLnF1aXp6LmdpZnMuY29ycmVjdCA6IHNjb3BlLm9wdGlvbnMucXVpenouZ2lmcy53cm9uZykgKyAxKSArIFwiLmdpZlwiXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUuaW5pdFVSTEdpZiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVybEdJRiA9IHNjb3BlLmdldFVSTEdpZigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLm5leHRDbGlwID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuaW5pdFVSTEdpZigpO1xyXG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ25leHRDbGlwJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUuc2hvdyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCduZXh0Q2xpcCcsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignYW5zd2VyR2l2ZW4nLCBmdW5jdGlvbihlLCBpbmZvcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnNob3coKTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5pbmZvcy5hbnN3ZXIgPSBpbmZvcztcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5pbml0VVJMR2lmKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgfSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpLnNlcnZpY2UoJ0FwaScsIGZ1bmN0aW9uKCRodHRwLCAkcSwgQ29uZmlnLCAkdGltZW91dCkge1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIFBlcmZvcm0gYW4gQVBJIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyB7dXJsLCBwYXJhbXMsIGRhdGEsIGNhbGxiYWNrLCBtZXRob2QsIGVycm9ySGFuZGxlciAoc2hvdWxkIHJldHVybiB0cnVlKSwgdGltZW91dCBpbiBNUywgYmxvY2tVSX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5jYWxsID0gZnVuY3Rpb24ob3B0aW9ucykge1xyXG5cclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGFuZ3VsYXIuZXh0ZW5kKHtcclxuICAgICAgICAgICAgdXJsOiBudWxsLFxyXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICBwYXJhbXM6IG51bGwsXHJcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiBudWxsLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiAzMDAwMCxcclxuICAgICAgICAgICAgZXJyb3JIYW5kbGVyOiBudWxsLFxyXG4gICAgICAgICAgICBibG9ja1VJOiB0cnVlLFxyXG4gICAgICAgIH0sIG9wdGlvbnMpO1xyXG5cclxuICAgICAgICB2YXIgY2FuY2VsZXIgPSAkcS5kZWZlcigpO1xyXG4gICAgICAgIHZhciBjYW5jZWxUaW1lb3V0ID0gb3B0aW9ucy50aW1lb3V0ID8gJHRpbWVvdXQoY2FuY2VsZXIucmVzb2x2ZSwgb3B0aW9ucy50aW1lb3V0KSA6IG51bGw7XHJcblxyXG5cclxuICAgICAgICB2YXIgdXJsID0gb3B0aW9ucy51cmwuaW5kZXhPZignaHR0cCcpID09IDAgPyBvcHRpb25zLnVybCA6IENvbmZpZy5hcGlCYXNlICsgb3B0aW9ucy51cmw7XHJcblxyXG4gICAgICAgICRodHRwKHtcclxuICAgICAgICAgICAgdXJsOiB1cmwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogb3B0aW9ucy5tZXRob2QsXHJcbiAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMsXHJcbiAgICAgICAgICAgIGRhdGE6IG9wdGlvbnMuZGF0YSxcclxuICAgICAgICAgICAgdGltZW91dDogY2FuY2VsZXIucHJvbWlzZVxyXG4gICAgICAgIH0pLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoY2FuY2VsVGltZW91dCk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLmNhbGxiYWNrKGRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSkuZXJyb3IoZnVuY3Rpb24obWVzc2FnZSwgc3RhdHVzKSB7XHJcbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChjYW5jZWxUaW1lb3V0KTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5lcnJvckhhbmRsZXIgPT0gJ2Z1bmN0aW9uJyAmJiBvcHRpb25zLmVycm9ySGFuZGxlcihtZXNzYWdlLCBzdGF0dXMpKSB7XHJcbiAgICAgICAgICAgICAgICAvL0Vycm9yIHdhcyBoYW5kbGVkIGJ5IHRoZSBjdXN0b20gZXJyb3IgaGFuZGxlclxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXN0YXR1cykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFcnJvciB3aXRob3V0IHN0YXR1czsgcmVxdWVzdCBhYm9ydGVkP1wiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgY2FuY2VsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGNhbmNlbGVyLnJlc29sdmUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgfTtcclxuXHJcbn0pOyJdfQ==
