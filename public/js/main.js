// Piano audio - https://www.freesound.org/people/Tesabob2001/packs/12995/

console.log('main.js linked and ready');

// High score board constructor - responsible fore keep global high scores synced with Firebase
var ScoreBoard = function() {
  this.dataRef = new Firebase('https://annasimongame.firebaseio.com');
  this.$scoreList = $('#scores');
  this.scores = [];
  this.game;
  this.addNewScore = function(initials) {
    var dataObj = {}
    dataObj.initials = initials || "???";
    dataObj.score = this.game.currentScore;
    this.dataRef.push(dataObj);
  };
  this.handleNewScore = function(snapshot) {
    var record = snapshot.val();
    this.scores.push(record);
    this.scores.sort(function(a, b) {
      return b.score - a.score;
    });
    this.renderScores();

  }.bind(this);
  this.renderScores = function() {
    this.$scoreList.text('');
    this.scores.forEach(function(record) {
      var score;
      if (record.score < 10) {
        score = "00" + record.score;
      } else if (record.score > 9 && record.score < 100) {
        score = "0" + record.score;
      } else {
        score = record.score;
      }
    $('<li></li>').text(score + " - " + record.initials).appendTo(this.$scoreList);
    }.bind(this));
  }.bind(this);
  // Listen for scores from FB
  this.dataRef.on('child_added', this.handleNewScore);
};

// Creates my Board constructor - responsible for the board's DOM stuff.
var Board = function() {
  this.highScore = 0;
  this.$buttons = $('.button');
  this.$highScore = $('#high-score');
  this.$currentScore = $('#current-score');
  this.$startButton = $('#start');
  this.$startButtonSpan = $('#start span');
  // will be set by initialize
  this.lightCycleTimerId;
  // will be set by Game
  this.game;
  this.initialize = function() {
    this.$startButton.one('click', this.game.startGame.bind(this.game));
    this.updateScores(0,0);
    this.lightCycleTimerId = this.cycleLights(150, 100);
  };
  this.updateScores = function(curr, high) {
    this.game.currentScore = curr;
    this.highScore = high;
    // console.log('High Score: %s', this.highScore);
    // console.log('Current Score: %s', this.game.currentScore);
    if (this.highScore < this.game.currentScore) {
      this.highScore = this.game.currentScore;
    }
    this.$highScore.text(this.highScore);
    this.$currentScore.text(this.game.currentScore);
  };
  this.lightUp = function(num) {
    var $button = this.$buttons.eq(num);
    var beep = new Audio('audio/beep' + (num + 1) + '.mp3')
    $button.toggleClass('lit');
    beep.play();
    var lightUpTimerId = window.setTimeout(function() {
      $button.toggleClass('lit');
    }, 500);
    return lightUpTimerId;
  };
  this.silentLightUp = function(num, duration) {
    duration = duration || 500;
    var $button = this.$buttons.eq(num);
    $button.toggleClass('lit');
    var lightUpTimerId = window.setTimeout(function() {
      $button.toggleClass('lit');
    }, duration);
    return lightUpTimerId;
  };
  this.randomButton = function() {
    var randomIndex = Math.floor(Math.random() * this.$buttons.length);
    return randomIndex;
  };
  this.cycleLights = function(duration, speed, order) {
    duration = duration || 500;
    speed = speed || 500;
    // Set up order of buttons
    var buttonOrder = order || [0,1,3,2];
    var currBtnIdx = 0;
    
    var lightTimerId = window.setInterval(function() {
      this.silentLightUp(buttonOrder[currBtnIdx], duration);
      currBtnIdx++;
      if (currBtnIdx === buttonOrder.length) {
        currBtnIdx = 0;
      }
    }.bind(this), speed);
    return lightTimerId;
  };
  this.stopLightCycle = function(timerId) {
    window.clearInterval(timerId);
  };
};

var Game = function() {
  this.initialize = function() {
    this.compSeq = [];
    this.userSeq = [];
    this.userCounter = 0;
    this.compCounter = 0;
    this.currentScore = 0;
  };
  this.board = new Board();
  this.scoreBoard = new ScoreBoard();
  this.board.game = this;
  this.scoreBoard.game = this;
  this.playCompSeq = function() {
    if (this.compCounter >= this.compSeq.length) {
      // it's now user's turn - they can click again
      this.board.$buttons.on('click', this.handleClick);
      this.compCounter = 0;
      // notify user it's their turn
      // console.log('User turn');
    } else {
      // light up the current button, then call yourself on a setTimeout
      // console.log('Lighting up current button. compCounter: %s', this.compCounter);
      this.board.lightUp(this.compSeq[this.compCounter]);
      this.compCounter++;
      window.setTimeout(this.playCompSeq.bind(this), 700);
    }
  };
  this.handleClick = function(event) {

    var userChoice = this.board.$buttons.index($(event.target))
    this.board.lightUp(userChoice);
    // add user's choice to current game's userSeq array
    this.userSeq.push(userChoice);
    // check to see if user choice matches computer entry
    // console.log('Counter: %s', this.userCounter);
    // console.log('Comp Counter: %s', this.compCounter);
    // console.log(this.compSeq)
    // console.log(this.userSeq)
    if (this.userSeq[this.userCounter] === this.compSeq[this.userCounter]) {
      // console.log('Not wrong!')
      // they got it right! Check if arrays are same length.
      // If not, increment game counter. If so, they've won.
      if (this.userSeq.length === this.compSeq.length) {
        this.currentScore++;
        this.board.updateScores(this.currentScore, this.board.highScore);
        this.compSeq.push(this.board.randomButton());
        this.userSeq = [];
        this.userCounter = 0;
        // disable further clicks now that sequence has been completed
        this.board.$buttons.off()
        window.setTimeout(this.playCompSeq.bind(this), 1000);
      } else {
        this.userCounter++;
      }
    // if the user's choice doesn't match the computer's choice, they've lost.
    } else {
      // User has lost
      this.askForHighScore();
      this.board.$startButtonSpan.text('Replay?');
      this.board.lightCycleTimerId = this.board.cycleLights(150,100);
      this.board.$startButton.one('click', this.startGame.bind(this));
      this.board.$buttons.off()
    }
  }.bind(this);
  this.askForHighScore = function() {
    // fade in modal asking for name for hscore list
    var $scorePrompt = $('<div class="hs-prompt"></div>').html('<input type="text" id="initials" placeholder="initials" maxlength="3"><button id="submit-hs">Submit Score</button><button id="cancel">Cancel</button>').appendTo($('body'));
    // add event listener on modal button that will:
    var $submitBtn = $scorePrompt.find('#submit-hs');
    var $cancelBtn = $scorePrompt.find('#cancel');
    var $initialsInput = $scorePrompt.find('#initials')
    var submitScore = function(e) {
      if (e.keyCode && e.keyCode !== 13) {
        return;
      }
      // grab current score & user's initials
      var initials = $initialsInput.val().toUpperCase();
      // then send them to Firebase
      this.scoreBoard.addNewScore(initials);
      // then get rid of modal.
      $scorePrompt.remove();
      $cancelBtn.off();
      $initialsInput.off()
    }.bind(this)

    $submitBtn.one('click', submitScore);
    $initialsInput.on('keypress', submitScore)
    $cancelBtn.one('click', function() {
      $scorePrompt.remove();
      $submitBtn.off();
      $initialsInput.off()
    });

    $('#initials').focus();
  };
  this.startGame = function() {
    console.log('Initializing game');
    this.board.stopLightCycle(this.board.lightCycleTimerId);
    this.board.$startButtonSpan.text('');
    this.currentScore = 0;
    this.board.updateScores(this.currentScore, this.board.highScore);
    this.initialize();
    this.compSeq.push(this.board.randomButton());
    window.setTimeout(this.playCompSeq.bind(this), 1000); 
  };
};

var game;

$(function() {
  game = new Game();
  game.board.initialize();
});




