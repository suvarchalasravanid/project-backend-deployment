const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const mongoose = require("mongoose");
const User = require('../models/User');
const Rest = require('../models/Rest');
const Reservation = require('../models/Reservation');
const Admins = require('../models/Admins');

// DELETE - Delete reservation
router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;
    const { username, seats } = req.body;

    try {
        // Find the reservation by restaurant ID and username
        const reservation = await Reservation.findOne({ restaurant: id, username });
        if (!reservation) {
            return res.status(404).json({ msg: 'Reservation not found' });
        }

        // Check if the number of seats to delete is valid
        if (seats > reservation.reserved_seats) {
            return res.status(400).json({ msg: 'Invalid number of seats to delete' });
        }

        // Update the reservation
        reservation.reserved_seats -= seats;

        // If no seats are left, delete the reservation
        if (reservation.reserved_seats === 0) {
            await reservation.remove();
        } else {
            await reservation.save();
        }

        // Update the restaurant's available seats
        const restaurant = await Rest.findById(id);
        restaurant.available_seats += seats;
        await restaurant.save();

        res.json({ msg: 'Reservation deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Register Route
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({ username, password });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            user: { id: user.id }
        };

        jwt.sign(payload, config.jwtSecret, { expiresIn: 3600 }, 
        (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if the user exists
        let user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Generate JWT token
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(payload, config.jwtSecret, { expiresIn: 3600 }, 
        (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});



// routes/auth.js


router.post('/adlogin', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      // Check if admin exists with username and password
      const admin = await Admins.findOne({ username, password });
  
      if (!admin) {
        return res.status(401).json({ msg: 'Invalid credentials' });
      }
  
      // If credentials are correct, return success
      res.status(200).json({ msg: 'Admin logged in successfully' });
  
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });


router.get("/",(req,res)=>{
    User.find((err,data)=>{
        if(err)
            return err
        else
            res.json(data)
    })
})
router.get("/restaurant",(req,res)=>{
    Rest.find((err,data)=>{
        if(err)
            return err
        else
            res.json(data)
    })
})
router.get("/printreserve",(req,res)=>{
    Reservation.find((err,data)=>{
        if(err)
            return err
        else
            res.json(data)
    })
})
router.get('/printreserverestname', async (req, res) => {
    try {
      const reservations = await Reservation.find().populate('restaurant', 'name');
      res.json(reservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      res.status(500).send('Server Error');
    }
  });

  router.delete('/deletebyadmin/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const reservation = await Reservation.findById(id);
      if (!reservation) {
        return res.status(404).json({ msg: 'Reservation not found' });
      }
  
      // Delete the reservation
      await reservation.remove();
  
      res.json({ msg: 'Reservation deleted successfully' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });
router.route("/extract/:id")
.get((req,res)=>{
    Rest.findById(mongoose.Types.ObjectId(req.params.id),
    (err,data)=>{
        if(err)
            return err
        else
            res.json(data)
    })
})
.put((req,res)=>{
    Rest.findByIdAndUpdate(mongoose.Types.ObjectId(req.params.id),
    {$set:req.body},
    (err,data)=>{
        if(err)
            return err
        else
            res.json(data)
    })

})

router.put("/updateSeats/:id", (req, res) => {
    const { id } = req.params;
    const { available_seats } = req.body;

    // Update available seats for the restaurant with provided id
    Rest.findByIdAndUpdate(id, { available_seats }, { new: true }, (err, updatedRest) => {
        if (err) {
            console.error("Error updating available seats:", err);
            return res.status(500).json({ msg: "Failed to update available seats" });
        }
        
        res.json(updatedRest);
    });
});

router.post('/reserve/:id', async (req, res) => {
    const { id } = req.params;
    const { username, seats } = req.body;

    try {
        // Find the restaurant by id
        let restaurant = await Rest.findById(id);
        if (!restaurant) {
            return res.status(404).json({ msg: 'Restaurant not found' });
        }

        // Check if requested seats are available
        if (seats > restaurant.available_seats) {
            return res.status(400).json({ msg: 'Not enough seats available' });
        }

        // Create new reservation
        const newReservation = new Reservation({
            username,
            reserved_seats: seats,
            restaurant: restaurant._id // Assign the restaurant id to the reservation
        });

        // Save reservation to database
        await newReservation.save();

        // Update available seats in the restaurant
        restaurant.available_seats -= seats;
        await restaurant.save();

        res.json({ msg: 'Reservation successful' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


router.get('/reservation/:id/:username', async (req, res) => {
    const { id, username } = req.params;

    try {
        const reservation = await Reservation.findOne({ restaurant: id, username });
        if (!reservation) {
            return res.status(404).json({ msg: 'Reservation not found' });
        }
        res.json(reservation);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
router.put('/edit/:id', async (req, res) => {
    const { id } = req.params;
    const { username, seats } = req.body;

    try {
        const reservation = await Reservation.findOne({ restaurant: id, username });
        if (!reservation) {
            return res.status(404).json({ msg: 'Reservation not found' });
        }

        const restaurant = await Rest.findById(id);
        if (!restaurant) {
            return res.status(404).json({ msg: 'Restaurant not found' });
        }

        const seatsDifference = seats - reservation.reserved_seats;
        if (seatsDifference > restaurant.available_seats) {
            return res.status(400).json({ msg: 'Not enough seats available' });
        }

        reservation.reserved_seats = seats;
        await reservation.save();

        restaurant.available_seats -= seatsDifference;
        await restaurant.save();

        res.json({ msg: 'Reservation updated successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
// Export the router
module.exports = router;
