const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load env vars
dotenv.config();

// Connect to database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const User = require('./models/User');

const seedAgents = async () => {
  try {
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('Agent123!', salt);

    const agents = [
      {
        name: 'Agent Bike-1 (Local)',
        email: 'agent.bike1@farmershub.com',
        password,
        role: 'DeliveryAgent',
        isApproved: true,
        status: 'Active',
        profileDetails: {
          phone: '0711111111',
          vehicleType: 'bike',
          maxCapacityKg: 20,
          serviceCities: ['Colombo', 'Gampaha'],
          isActiveAgent: true
        }
      },
      {
        name: 'Agent Van-1 (Regional)',
        email: 'agent.van1@farmershub.com',
        password,
        role: 'DeliveryAgent',
        isApproved: true,
        status: 'Active',
        profileDetails: {
          phone: '0722222222',
          vehicleType: 'van',
          maxCapacityKg: 500,
          serviceCities: ['Colombo', 'Kandy'],
          isActiveAgent: true
        }
      },
      {
        name: 'Agent Truck-1 (Heavy)',
        email: 'agent.truck1@farmershub.com',
        password,
        role: 'DeliveryAgent',
        isApproved: true,
        status: 'Active',
        profileDetails: {
          phone: '0733333333',
          vehicleType: 'truck',
          maxCapacityKg: 2000,
          serviceCities: ['Colombo', 'Kandy', 'Galle', 'Matara', 'Jaffna'],
          isActiveAgent: true
        }
      },
      {
        name: 'Agent Tempo-1 (South)',
        email: 'agent.tempo1@farmershub.com',
        password,
        role: 'DeliveryAgent',
        isApproved: true,
        status: 'Active',
        profileDetails: {
          phone: '0744444444',
          vehicleType: 'tempo',
          maxCapacityKg: 1000,
          serviceCities: ['Galle', 'Matara'],
          isActiveAgent: true
        }
      },
      {
        name: 'Agent Bike-2 (Central)',
        email: 'agent.bike2@farmershub.com',
        password,
        role: 'DeliveryAgent',
        isApproved: true,
        status: 'Active',
        profileDetails: {
          phone: '0755555555',
          vehicleType: 'bike',
          maxCapacityKg: 30,
          serviceCities: ['Kandy', 'Kurunegala'],
          isActiveAgent: true
        }
      }
    ];

    console.log('Seeding 5 constant delivery agents...');
    
    let createdCount = 0;
    
    for (const agent of agents) {
      const exists = await User.findOne({ email: agent.email });
      if (!exists) {
        await User.create(agent);
        console.log(`Created: ${agent.name}`);
        createdCount++;
      } else {
        console.log(`Already exists: ${agent.name}`);
      }
    }

    console.log(`Seeding finished. Created ${createdCount} agents.`);
    process.exit();
  } catch (error) {
    console.error('Error seeding agents:', error);
    process.exit(1);
  }
};

seedAgents();
