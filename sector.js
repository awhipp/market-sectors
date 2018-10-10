var IEX_ENDPOINT = "https://api.iextrading.com/1.0";
var SECTOR_ENDPOINT = "/stock/market/sector-performance";
var TICKER_ENDPOINT = "/stock/market/collection/sector?collectionName=";

function Sector(data) {
    this.sectors = [];
    this.sectorData = [];
    this.sectorColors = [];
    this.myBar = undefined;
    this.tickerTable =  $("#tickerTable").DataTable( {
        "order": [[ 3, "desc" ]],
        responsive: true
    } );
    this.latestSectorData = undefined;

    for(var i = data.length-1; i >= 0; i--){
      this.sectors.push(data[i].name);
      this.sectorData.push((data[i].performance*100).toFixed(2));
      this.sectorColors.push(Samples.utils.getSectorColor(data[i].performance*100));
    }

    this.createChart();
}

Sector.prototype.createChart = function(){
  var color = Chart.helpers.color;
  var barChartData = {
    labels: this.sectors,
    datasets: [{
      backgroundColor: this.sectorColors,
      borderColor: window.chartColors.black,
      borderWidth: 1,
      data: this.sectorData
    }]
  };

  var thiz = this;
  $(".loaderHolder").fadeOut().promise().then(function(){
    var ctx = document.getElementById('canvas').getContext('2d');
    thiz.myBar = new Chart(ctx, {
      type: 'bar',
      data: barChartData,
      options: {
        responsive: true,
        tooltips: { enabled: false },
        hover: { mode: null },
        legend: { display: false },
        title: {
          display: true,
          text: 'Live Market Sector Performance',
          fontColor: 'black'
        },
        onClick: function(c,i) {
          $(".loaderHolder").fadeIn();
          e = i[0];
          var indexVal = e._index;
          var x_value = this.data.labels[e._index];
          var y_value = this.data.datasets[0].data[e._index];
          getSectorTickers(x_value);
        },
        hover: { "animationDuration": 1 },
        "animation": {
          "duration": 1,
          "onComplete": function() {
            var chartInstance = this.chart,
            ctx = chartInstance.ctx;
            ctx.font = Chart.helpers.fontString(Chart.defaults.global.defaultFontSize, Chart.defaults.global.defaultFontStyle, Chart.defaults.global.defaultFontFamily);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';

            this.data.datasets.forEach(function(dataset, i) {
              var meta = chartInstance.controller.getDatasetMeta(i);
              meta.data.forEach(function(bar, index) {
                var data = dataset.data[index];
                if(data >= 0) {
                  ctx.fillText(data + "%", bar._model.x, bar._model.y - 0);
                } else {
                  ctx.fillText(data + "%", bar._model.x, bar._model.y + 15);
                }
              });
            });
          }
        }
      }
    });
  });

}


Sector.prototype.updateTable = function(data){
  this.sectorData = [];
  for(var i = data.length-1; i >= 0; i--){
    this.sectorData.push((data[i].performance*100).toFixed(2));
  }
  this.myBar.data.datasets[0].data = this.sectorData;
  this.myBar.update();
}

Sector.prototype.addRow = function(row) {
  this.tickerTable.row.add( row ).draw( false );
}

Sector.prototype.drawTable = function() {
  this.tickerTable.draw();
}

Sector.prototype.clearTable = function() {
  this.tickerTable.clear().draw();
}

function getMinimizedTicker(tickerData) {
  var companyName = tickerData.companyName;
  if(companyName.length > 22) {
    companyName = companyName.substring(0,22).trim() + "...";
  }

  var dir = "green";
  var percentChange = (tickerData.changePercent*100).toFixed(2);
  if(percentChange < 0) {
      dir = "red";
  } else if (percentChange == 0) {
      dir = "black";
  }

  return [
    companyName + "&nbsp;(" + tickerData.symbol + ")",
    tickerData.iexRealtimePrice,
    tickerData.change,
    "<span style='color: "+dir+";'>" + percentChange + "%</span>",
    tickerData.open,
    tickerData.high,
    tickerData.low,
    tickerData.close,
    tickerData.iexVolume
  ]
}

function getSectorTickers(sector) {
  $.ajax({
    url : IEX_ENDPOINT + TICKER_ENDPOINT + sector.replace(" ", "%20"),
    type : "get",
    dataType: "jsonp",
    success : function(data) {
      window.sector.latestSectorData = data;

      $(".tickerHeader").text(sector + " Sector Companies");
      window.sector.clearTable();
      for(var i = 0; i < data.length; i++) {
        if(data[i].iexVolume > 0) {
          window.sector.addRow(
            getMinimizedTicker(data[i])
          );
        }
      }
      window.sector.drawTable();
      $(".loaderHolder").fadeOut();
      openTickerBox();
    },
    error: function(e) {
      console.log(e);
    }
  });
}

// Get the modal
var tickerModal = document.getElementById('tickerModal');
// Get the <span> element that closes the modal
var closeSpan = document.getElementsByClassName("close")[0];
// When the user clicks on the button, open the modal
function openTickerBox() {
    tickerModal.style.display = "block";
}

$(function(){
  setInterval(function(){
    $.ajax({
      url : IEX_ENDPOINT + SECTOR_ENDPOINT,
      type : "get",
      dataType: "jsonp",
      success : function(data) {
        if(window.sector){
          window.sector.updateTable(data);
        }else{
          window.sector = new Sector(data);
        }
      },
      error: function(e) {
        console.log(e);
      }
    });
  }, 500);


  // When the user clicks on <span> (x), close the modal
  closeSpan.onclick = function() {
      tickerModal.style.display = "none";
  }

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
      if (event.target == tickerModal) {
          tickerModal.style.display = "none";
      }
  }

});
