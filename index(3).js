const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
console.log(mongoose.connection);


app.use(cors())
app.use(express.static('public'))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  count: {type: Number, default: 0},
  log: [{
    description: {type: String},
    duration: {type: Number},
    date: String
  }]
});

let User = mongoose.model('User', userSchema);

app.route('/api/users')
  .post(function(req, res) {
    const { username } = req.body;

    const newUser = new User({ username: username });
    newUser.save(function(err, savedUser) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al guardar el usuario' });
      }
      res.json({ username: savedUser.username, _id: savedUser._id });
    });
  })
  .get(function(req, res) {
    User.find({}, function(err, users) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al obtener los usuarios' });
      }
      res.json(users);
    });
  });


app.post('/api/users/:_id/exercises', function(req, res) {
  const { _id } = req.params; // Obtiene el ID de usuario de los parámetros de la URL
  const { description, duration, date } = req.body; // Obtiene los datos del ejercicio del cuerpo de la solicitud

  // Busca el usuario en la base de datos por su ID
  User.findById(_id, function(err, user) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al buscar el usuario' });
    }

    // Crea un nuevo ejercicio
    const newExercise = {
      description: description,
      duration: duration,
      date: date || new Date().toISOString().substring(0, 10) // Si no se proporciona una fecha, se utiliza la fecha actual
    };

    // Agrega los campos del ejercicio al objeto de usuario
    if (!user.log) {
      user.log = [];
    }

    // Agrega el ejercicio al registro de actividad del usuario
    user.log.push(newExercise);

    // Guarda el usuario actualizado en la base de datos
    user.save(function(err, updatedUser) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al guardar el ejercicio en el usuario' });
      }

      // Devuelve el objeto de usuario actualizado como respuesta
      res.json(updatedUser);
    });
  });
});




app.get('/api/users/:_id/logs', function(req, res) {
  const { _id } = req.params; // Obtiene el ID de usuario de los parámetros de la URL
  const { from, to, limit } = req.query; // Obtiene los parámetros from, to y limit de la consulta URL
 
  let logFilter = {};
  // Busca el usuario en la base de datos por su ID
  User.findById(_id, function(err, user) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al buscar el usuario' });
    }

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    let filteredLog = user.log.filter(exercise => {
      // Filtra el registro de ejercicios del usuario según el filtro de fecha
      if (logFilter.date) {
        const exerciseDate = new Date(exercise.date).toISOString().substring(0, 10);
        return exerciseDate >= logFilter.date.$gte && exerciseDate <= logFilter.date.$lte;
      }
      return true;
    });

    if (limit) {
      filteredLog = filteredLog.slice(0, limit);
    }

    // Calcula el número de ejercicios en el registro del usuario
    const exerciseCount = user.log.length;

    // Devuelve el objeto de usuario con el registro completo de ejercicios y el contador de ejercicios como respuesta
    res.json({
      _id: user._id,
      username: user.username,
      count: filteredLog.length,
      log: filteredLog.map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date
      }))
    });
  });
});




const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
