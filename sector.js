var IEX_ENDPOINT = "https://api.iextrading.com/1.0";
var SECTOR_ENDPOINT = "/stock/market/sector-performance";

function Sector(data) {
    this.sectors = [];
    this.sectorData = [];
    this.sectorColors = [];
    this.myBar = undefined;

    for(var i = 0; i < data.length; i++){
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

  var ctx = document.getElementById('canvas').getContext('2d');
  this.myBar = new Chart(ctx, {
    type: 'bar',
    data: barChartData,
    options: {
      responsive: true,
      tooltips: { enabled: false },
      hover: { mode: null },
      legend: { display: false },
      title: {
        display: true,
        text: 'Live Market Sector Performance'
      },
      hover: { "animationDuration": 0 },
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
}


Sector.prototype.updateTable = function(data){
  this.sectorData = [];
  for(var i = 0; i < data.length; i++){
    this.sectorData.push((data[i].performance*100).toFixed(2));
  }
  this.myBar.data.datasets[0].data = this.sectorData;
  this.myBar.update();
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
      error: function() {
        connectionError();
      }
    });
  }, 1000);
});
