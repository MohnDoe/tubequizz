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
            link: function(scope, element, attrs) {
                scope.$watchCollection('clip', function(newValue, oldValue) {
                    console.log(newValue);
                }, true);
            },
            controller: function($scope, $element, $rootScope) {
                var scope = this;

                var defaultOptions = {
                    mode: 'view', //view/create
                };

                angular.extend(scope.clip, defaultOptions);

                var player, restartTimer, loopStarted, initInterval;

                function loop() {
                    player.seekTo(scope.clip.start_time / 1000, true);
                    player.playVideo();
                    restartTimer = $timeout(loop, scope.clip.duration);
                }

                function initYoutube() {
                    console.log('initYoutube');
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
                            'onReady': function() {

                                //Scale player
                                var containerWidth = $element[0].clientWidth;
                                player.getIframe().width = containerWidth;
                                player.getIframe().height = containerWidth * 0.5625;

                                player.seekTo(scope.clip.start_time / 1000, true);
                                //player.playVideo();
                            },
                            'onStateChange': function() {
                                if (player.getPlayerState() == 1 && !loopStarted) {
                                    loop();
                                    loopStarted = true;
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
                    console.log(scope.clip);
                    initYoutube();
                }

                $scope.$on('seekPlayer', function(event, ms) {
                    if (!loopStarted) return;
                    $timeout.cancel(restartTimer);
                    player.seekTo(ms / 1000, true);
                    player.pauseVideo(); //Yes or no?
                });

                $scope.$on('startLoop', function(event, ms) {
                    if (!loopStarted) return;
                    $timeout.cancel(restartTimer);
                    loop();
                });

                $scope.$on('playLastSecond', function(event, ms) {
                    if (!loopStarted) return;
                    $timeout.cancel(restartTimer);
                    player.seekTo((scope.clip.start_time + scope.clip.duration - 1000) / 1000, true);
                    player.playVideo();
                    restartTimer = $timeout(loop, 1000);
                });

                $scope.$on('$destroy', function() {
                    player.pauseVideo();
                    $timeout.cancel(restartTimer);
                    $interval.cancel(initInterval);
                })
                $rootScope.$on('clipChanged', function(e, a) {
                    changeClip(a)
                });

            }
        };

    });