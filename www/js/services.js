angular.module('MyStockApp.services', [])


.constant('FIREBASE_URL','https://stockmarketapp-95706.firebaseio.com/')

.factory('encodeURIService',function(){
  return{
    encode: function(string){
      console.log(string);
      return encodeURIComponent(string).replace(/\"/g, "%22").replace(/\ /g, "%20").replace(/[!'()]/g, escape);
    }
  };
})

.service('modalService',function($ionicModal) {

    this.openModal = function(id) {
      var _this = this;

      if(id == 1)
      {
        $ionicModal.fromTemplateUrl('templates/search.html', {
          scope: null,
          controller: 'SearchCtrl'
        }).then(function(modal) {
          _this.modal = modal;
          _this.modal.show();
        });
      }
      else if(id == 2)
      {
        $ionicModal.fromTemplateUrl('templates/login.html', {
          scope: null,
          controller:'LoginSignupCtrl'
        }).then(function(modal) {
          _this.modal = modal;
          _this.modal.show();
        });
      }
      else if(id == 3)
      {
        $ionicModal.fromTemplateUrl('templates/signup.html', {
          scope: null,
          controller:'LoginSignupCtrl'
        }).then(function(modal) {
          _this.modal = modal;
          _this.modal.show();
        });
      }

  };

    this.closeModal = function() {
      var _this = this;
      if(!_this.modal) return;
      _this.modal.hide();
      _this.modal.remove();
    };

})


.factory('firebaseRef',function($firebase, FIREBASE_URL) {

  var config = {
   apiKey: "AIzaSyDkSgYF-Ub-iRjQjRkY53x3LrX6SMomubU",
   authDomain: "stockmarketapp-95706.firebaseapp.com",
   databaseURL: "https://stockmarketapp-95706.firebaseio.com",
   storageBucket: "stockmarketapp-95706.appspot.com",
   messagingSenderId: "333586143595"
 };
  var firebaseRef = firebase.initializeApp(config);
  return firebaseRef;
})

.factory('firebaseUserRef',function(firebaseRef){
  var userRef = firebaseRef.database().ref().child('users');
  return userRef;
})


.factory('userService',function($window, $rootScope, $timeout, firebaseRef, firebaseUserRef, myStocksArrayService,notesCacheService,myStocksCacheService , modalService) {


  var login  = function(user,signup) {
    firebaseRef.auth().signInWithEmailAndPassword(user.email, user.password)
    .then(function(userData) {
        $rootScope.currentUser = user;
        if(signup){
          modalService.closeModal();
        }
        else {
          myStocksCacheService.removeAll();
          notesCacheService.removeAll();
          loadUserData(userData);
          modalService.closeModal();
          $timeout(function () {
             $window.location.reload(true);
          }, 400);
        }
        console.log("Authenticated Successfully with payload:", userData);

    })
    .catch(function(error){
      console.log("Login failed:", error);

    });

  };
  var signup = function(user) {
    firebaseRef.auth().createUserWithEmailAndPassword(
         user.email,
         user.password
       ).then(function(userData) {

           login(user, true);
           firebaseRef.database().ref().child('emails').push(user.email);
           firebaseUserRef.child(userData.uid).child('stocks').set(myStocksArrayService);
           console.log("Successfully created user account with uid:", userData.uid);
           var stocksWithNotes = notesCacheService.keys();
           stocksWithNotes.forEach(function(stockWithNotes){
             var notes = notesCacheService.get(stockWithNotes);
             notes.forEach(function(note){
               firebaseUserRef.child(userData.uid).child('notes').child(note.ticker).push(note);
             });
           });

       })
       .catch(function(error){
         console.log("Error creating user:", error);

       });
  };
  var logout = function() {
    firebaseRef.auth().signOut()
    .then(function() {
       $rootScope.currentUser = '';
       $rootScope.$apply();
       notesCacheService.removeAll();
       myStocksCacheService.removeAll();
       $window.location.reload(true);
        console.log("User Log out successfully");
      })
    .catch(function(error){
        console.log("Log out error", error);
    });
  };

   var updateStocks = function(stocks) {
    firebaseRef.auth().onAuthStateChanged(function(user) {
      if (user) {
        uid = user.uid;
        firebaseUserRef.child(uid).child('stocks').set(stocks);

      }
      else
      {

        console.log("no user sign in");
      }
    });

  };

var updateNotes = function(ticker, notes){
  console.log(notes);
  var noteDb = [];
  firebaseRef.auth().onAuthStateChanged(function(user) {
    if (user) {
      uid = user.uid;
        var childKey = firebaseUserRef.child(uid).child('notes').child(ticker);
            childKey.remove();
            notes.forEach(function(note){

        firebaseUserRef.child(uid).child('notes').child(note.ticker).push(note);
      });
    }
    else
    {
        console.log("no user sign in");
    }
  });
};

var updateNotes1 = function(ticker, notes){
  firebaseRef.auth().onAuthStateChanged(function(user) {
    if (user) {
      uid = user.uid;
           var childKey = firebaseUserRef.child(uid).child('notes').child(ticker);
           childKey.remove();
           notes.forEach(function(note){
              firebaseUserRef.child(uid).child('notes').child(note.ticker).push(note);
      });
    }
    else
    {
        console.log("no user sign in");
    }
  });
};


 var loadUserData = function(authData){

   firebaseUserRef.child(authData.uid).child('stocks').once('value',function(snapshot) {
     var stocksFromDatabase = [];
     angular.forEach(snapshot.val(),function(stock) {
         var stockToAdd = {ticker : stock.ticker};
         stocksFromDatabase.push(stockToAdd);
       });
       myStocksCacheService.put('myStocks',stocksFromDatabase);

   },function(error) {
      console.log("Firebase error => stocks" + error);
   });

   firebaseUserRef.child(authData.uid).child('notes').once('value',function(snapshot){

     angular.forEach(snapshot.val(),function(stockWithNotes) {
         var notesFromDatabase = [];

         angular.forEach(stockWithNotes,function(note){
           notesFromDatabase.push(note);
           notesCacheService.put(note.ticker,notesFromDatabase);
         });
       });


   },function(error){
     console.log("Firebase error -> notes: " + error);
   });

 };



  var getUser = function()
  {
      firebaseRef.auth().onAuthStateChanged(function(user){
       if(user)
       {
          user.providerData.forEach(function (profile) {
          console.log("Sign-in provider: "+profile.providerId);
          console.log("  Provider-specific UID: "+profile.uid);
          console.log("  Name: "+profile.displayName);
          console.log("  Email: "+profile.email);
          console.log("  Photo URL: "+profile.photoURL);
        });

         $rootScope.currentUser = user;
       }
       else
       {
          console.log("User data is not fetched");
       }
     });


  };



  return{
    login: login,
    signup: signup,
    logout: logout,
    updateStocks: updateStocks,
    updateNotes: updateNotes,
    updateNotes1: updateNotes1,
    getUser: getUser
  };

})
.factory('dateService',function($filter){

  var currentDate = function(){
    var d = new Date();
    var date = $filter('date')(d, 'yyyy-MM-dd');
    return date;
  };
  var oneYearAgoDate = function(){
    var d = new Date(new Date().setDate(new Date().getDate() - 365));
    var date = $filter('date')(d, 'yyyy-MM-dd');
    return date;
  };
  var oneDayAgo = function(){
    var d = new Date(new Date().setDate(new Date().getDate() -5));
    var date = $filter('date')(d, 'yyyy-MM-dd');
    return date;
  };
  var oneWeekAgo = function(){
    var d = new Date(new Date().setDate(new Date().getDate() -9));
    var date = $filter('date')(d, 'yyyy-MM-dd');
    return date;
  };
  var threeMonthAgo = function(){
    var d = new Date(new Date().setDate(new Date().getDate() -90));
    var date = $filter('date')(d, 'yyyy-MM-dd');
    return date;
  };
  var twoYearsAgo = function(){
    var d = new Date(new Date().setDate(new Date().getDate() -455));
    var date = $filter('date')(d, 'yyyy-MM-dd');
    return date;
  };
  return{
    currentDate: currentDate,
    oneYearAgoDate: oneYearAgoDate,
    oneDayAgo: oneDayAgo,
    oneWeekAgo: oneWeekAgo,
    threeMonthAgo: threeMonthAgo,
    twoYearsAgo: twoYearsAgo

  };

})

.factory('chartDataCacheService',function(CacheFactory){
  var chartDataCache;
  if(!CacheFactory.get('chartDataCache'))
  {
    chartDataCache = CacheFactory('chartDataCache',{
      maxAge: 60 * 60 * 8 * 1000,
      deleteOnExpire: 'aggressive',
      storageMode: 'localStorage'
    });
  }
  else
  {
     chartDataCache = CacheFactory.get('stockDetailsCache');
  }
  return chartDataCache;
})

.factory('stockDetailsCacheService',function(CacheFactory){
  var stockDetailsCache;
  if(!CacheFactory.get('stockDetailsCache')) {
    stockDetailsCache = CacheFactory('stockDetailsCache', {
       maxAge: 60 * 1000,
       deleteOnExpire: 'aggressive',
       storageMode: 'localStorage'
     });
   }
   else
   {
     stockDetailsCache = CacheFactory.get('stockDetailsCache');
   }

  return stockDetailsCache;
})

.factory('stockPriceCacheService',function(CacheFactory){
  var stockPriceCache;
  if(!CacheFactory.get('stockPriceCache')) {
    stockPriceCache = CacheFactory('stockPriceCache', {
       maxAge: 5 * 1000,
       deleteOnExpire: 'aggressive',
       storageMode: 'localStorage'
     });
   }
   else
   {
     stockPriceCache = CacheFactory.get('stockPriceCache');
   }

  return stockPriceCache;
})

.factory('stockDataCacheService1',function(CacheFactory){
  var stockDataCache1;
  if(!CacheFactory.get('stockDataCache1')) {
    stockDataCache1 = CacheFactory('stockDataCache1', {
       maxAge: 5 * 1000,
       deleteOnExpire: 'aggressive',
       storageMode: 'localStorage'
     });
   }
   else
   {
     stockDataCache1 = CacheFactory.get('stockDataCache1');
   }

  return stockDataCache1;
})

.factory('notesCacheService',function(CacheFactory){

  var notesCache;

  if(!CacheFactory.get('notesCache')) {
    notesCache = CacheFactory('notesCache',{
      storageMode: 'localStorage'
    });
  }
  else {
    notesCache = CacheFactory.get('notesCache');
  }
  return notesCache;
})

.factory('fillMyStocksCacheService',function(CacheFactory){

  var myStocksCache;
  if(!CacheFactory.get('myStocksCache')) {
      myStocksCache = CacheFactory('myStocksCache',{
        storageMode: 'localStorage'
      });
  }
  else {
    myStocksCache = CacheFactory.get('myStocksCache');
  }

  var fillMyStocksCache = function(){
      var myStocksArray = [
        {ticker:"AAPL"},
        {ticker:"GPRO"},
        {ticker:"FB"},
        {ticker:"NFLX"},
        {ticker:"TSLA"},
        {ticker:"BRK.A"},
        {ticker:"INTC"},
        {ticker:"MSFT"},
        {ticker:"GE"},
        {ticker:"BAC"},
        {ticker:"C"},
        {ticker:"T"}
      ];
      myStocksCache.put('myStocks',myStocksArray);
  };

    return{
      fillMyStocksCache: fillMyStocksCache
    };

})

.factory('myStocksCacheService', function(CacheFactory){

  var myStocksCache = CacheFactory.get('myStocksCache');

  return myStocksCache;
})

.factory('myStocksArrayService', function(fillMyStocksCacheService, myStocksCacheService){

  if(!myStocksCacheService.info('myStocks')) {
    fillMyStocksCacheService.fillMyStocksCache();
  }

  var myStocks = myStocksCacheService.get('myStocks');

  return myStocks;
})



.factory('followStockService',function($window, firebaseRef, myStocksArrayService, myStocksCacheService, userService){
  return {

    follow: function(ticker) {
      var uid = "";
      firebaseRef.auth().onAuthStateChanged(function(user) {
          if (user)
          {
            uid = user.uid;
          }
          else
          {
             console.log("no user sign in");
          }
        });
        var stockToAdd ={"ticker": ticker};
        myStocksArrayService.push(stockToAdd);
        myStocksCacheService.put('myStocks',myStocksArrayService);
        if(uid!==null){
          userService.updateStocks(myStocksArrayService);
        }

    },
    unfollow: function(ticker) {
      var uid = "";
      firebaseRef.auth().onAuthStateChanged(function(user) {
        if (user)
        {
          uid = user.uid;

        }
        else
        {
            console.log("no user sign in");
        }
      });


      for(var i = 0; i < myStocksArrayService.length; i++) {
        if(myStocksArrayService[i].ticker == ticker) {
          myStocksArrayService.splice(i, 1);
          myStocksCacheService.remove('myStocks');
          myStocksCacheService.put('myStocks', myStocksArrayService);
          if(myStocksArrayService.length === 0)
          {
            $window.location.reload();
          }

          if(uid!==null){
            userService.updateStocks(myStocksArrayService);
          }

          break;
        }
      }

    },
    checkFollowing: function(ticker) {
        for(var i=0; i < myStocksArrayService.length; i++) {
          if(myStocksArrayService[i].ticker == ticker) {
            return true;
          }
        }
        return false;
    }
  };
})

.factory('stockDataService',function($q, $http, encodeURIService,stockDetailsCacheService,stockPriceCacheService,stockDataCacheService1){

  var getDetailsData = function(ticker)
  {
    var deffered = $q.defer(),
    cacheKey = ticker,
    stockDetailsCache = stockDetailsCacheService.get(cacheKey),
    url = 'https://api.iextrading.com/1.0/stock/'+ticker +'/quote';
    console.log(url);
    if(stockDetailsCache)
    {
       deffered.resolve(stockDetailsCache);
    }
    else
    {
      $http.get(url)
      .success(function(json){
        var jsonData = json;
        deffered.resolve(jsonData);
        stockDetailsCacheService.put(cacheKey, jsonData);
      })
      .error(function(error){
          console.log("Details Data error : "+error);
          deffered.reject();
      });

    }


    return deffered.promise;
  };



  var getPriceData = function(ticker)
  {

      var deffered = $q.defer(),
      cacheKey = ticker,
      stockPriceCache =  stockPriceCacheService.get(cacheKey);
      url = 'https://api.iextrading.com/1.0/stock/'+ticker +'/quote';

        $http.get(url)
        .success(function(json){
          var jsonData = json;
          deffered.resolve(jsonData);
          stockPriceCacheService.put(cacheKey, jsonData);

        })
        .error(function(error){
            console.log("Price Data error : "+error);
            deffered.reject();
        });



    return deffered.promise;
  };

  var getDetailsData1 = function(ticker){

    var deffered = $q.defer(),
    cacheKey = ticker,
    stockDataCache =  stockDataCacheService1.get(cacheKey);
    url = 'https://api.iextrading.com/1.0/stock/'+ ticker +'/stats';

      $http.get(url)
      .success(function(json){
        var jsonData = json;
        deffered.resolve(jsonData);
        stockDataCacheService1.put(cacheKey, jsonData);

      })
      .error(function(error){
          console.log("Price Data error : "+error);
          deffered.reject();
      });



  return deffered.promise;

  };


  return {
      getPriceData: getPriceData,
      getDetailsData: getDetailsData,
      getDetailsData1: getDetailsData1

  };



})




.factory('chartDataService',function($q, $http, encodeURIService,chartDataCacheService){

  var getHistoricalData = function(ticker,fromDate,todayDate,n){

    var deferred = $q.defer(),
    cacheKey = ticker+" fromdate: "+fromDate+" todaydate: "+todayDate,
    chartDataCache = chartDataCacheService.get(cacheKey);

    console.log(n);
    if(n==1)
    {
      url = 'https://api.iextrading.com/1.0/stock/'+ ticker +'/chart/1m';
    }
    else if(n==2){
      url = 'https://api.iextrading.com/1.0/stock/'+ ticker +'/chart/3m';
    }
    else if(n==3){
      url = 'https://api.iextrading.com/1.0/stock/'+ ticker +'/chart/6m';
    }
    else if(n == 4){
      url = 'https://api.iextrading.com/1.0/stock/'+ ticker +'/chart/1y';
    }
    else if(n == 5)
    {
      url = 'https://api.iextrading.com/1.0/stock/'+ ticker + '/chart/5y';
    }

    if(chartDataCache) {
       deferred.resolve(chartDataCache);
     }
     else {




           $http.get(url)
             .success(function(json) {
               var jsonData = json;
               console.log(json);

               var priceData = [],
               volumeData = [];

               angular.forEach(jsonData,function(dayDataObject) {
                 console.log(dayDataObject);

                 date = Date.parse(dayDataObject.date),

                 price = parseFloat(Math.round(dayDataObject.close * 100) / 100).toFixed(3),
                 volume = dayDataObject.volume,

                 volumeDatum = '[' + date + ',' + volume + ']',
                 priceDatum = '[' + date + ',' + price + ']';
                 volumeData.unshift(volumeDatum);
                 priceData.unshift(priceDatum);


               });

               var formattedChartData =
               '[{' +
                 '"key":' + '"volume",' +
                 '"bar":' + 'true,' +
                 '"values":' + '[' + volumeData + ']' +
               '},' +
               '{' +
                 '"key":' + '"' + ticker + '",' +
                 '"values":' + '[' + priceData + ']' +
               '}]';

               deferred.resolve(formattedChartData);
               chartDataCacheService.put(cacheKey, formattedChartData);
             })
             .error(function(error) {
               console.log("Chart data error: " + error);
               deferred.reject();
             });
       }


    return deferred.promise;

  };
  return {
     getHistoricalData: getHistoricalData,

  };

})

.factory('notesService',function(notesCacheService,firebaseRef, userService){

  return{
    getNotes : function(ticker){
      return notesCacheService.get(ticker);
    },
    addNote : function(ticker, note){
      var stockNotes = [];
      if(notesCacheService.get(ticker)) {
        stockNotes = notesCacheService.get(ticker);
        stockNotes.push(note);
      }
      else {
        stockNotes.push(note);
      }
      notesCacheService.put(ticker, stockNotes);
      var uid = "";
      firebaseRef.auth().onAuthStateChanged(function(user) {
          if (user)
          {
            uid = user.uid;
          }
          else
          {
             console.log("no user sign in");
          }
        });
       if(uid!==null){
         var notes = notesCacheService.get(ticker);
         userService.updateNotes(ticker,stockNotes);
       }
    },
    deleteNote : function(ticker, index){
      var stockNotes = [];
       stockNotes = notesCacheService.get(ticker);
       stockNotes.splice(index,1);
       notesCacheService.put(ticker, stockNotes);
       var uid = "";
       firebaseRef.auth().onAuthStateChanged(function(user) {
           if (user)
           {
             uid = user.uid;
           }
           else
           {
              console.log("no user sign in");
           }
         });
        if(uid!==null){
          var notes = notesCacheService.get(ticker);
          userService.updateNotes1(ticker, stockNotes);

        }
    }
  };
})
.factory('newsService',function($q, $http) {

  return{
    getNews: function(ticker) {

      var deferred = $q.defer(),
      x2js = new X2JS(),
      url = "http://finance.yahoo.com/rss/headline?s=" + ticker;

      $http.get(url)
        .success(function(xml) {
          var xmlDoc = x2js.parseXmlString(xml),
          json = x2js.xml2json(xmlDoc),
          jsonData = json.rss.channel.item;
          deferred.resolve(jsonData);
        })
        .error(function(error) {
          deferred.reject();
          console.log("News Error: " + error);
        });
        return deferred.promise;
    }

  };

})
.factory('searchService',function($q, $http){
  return{
    search : function(query) {
      var deferred = $q.defer(),
      url =  'https://s.yimg.com/aq/autoc?query='+ query +'&region=CA&lang=en-CA';
      $http.get(url)
          .success(function(data, status, config , statusText) {
            var jsonData = data.ResultSet.Result;
            deferred.resolve(jsonData);
          })
          .error(function(error) {
              console.log(error);
              deferred.reject();
          });

        return deferred.promise;
    }
  };
})
;
